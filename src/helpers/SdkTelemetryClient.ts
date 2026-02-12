import {
  ITelemetryConfig,
  ITelemetryEvent,
  ITelemetryContext,
} from "../types/telemetry";

/**
 * SdkTelemetryClient - Internal SDK error reporting (Simplified)
 *
 * Features:
 * - Immediate send (no batching or buffer)
 * - Non-blocking (never throws)
 * - Sanitization (truncate message/stack)
 * - Fire-and-forget with timeout
 */
export class SdkTelemetryClient {
  private config: ITelemetryConfig;
  private readonly REQUEST_TIMEOUT_MS = 5000;
  private readonly MAX_MESSAGE_LENGTH = 500;

  constructor(config: ITelemetryConfig) {
    this.config = config;
  }

  /**
   * Capture an exception and send immediately
   * @param error - Error object or any thrown value
   * @param context - Additional context (tenant_id, feature, process_id, user_id, metadata, etc.)
   */
  public captureException(error: unknown, context?: ITelemetryContext): void {
    try {
      const event = this.buildEvent(error, context || {});

      // Send immediately (fire-and-forget)
      this.sendEvent(event);
    } catch (e) {
      // Silent failure - never throw
    }
  }

  /**
   * Extract error information from error object
   */
  private extractErrorInfo(error: unknown): { name: string; message: string; stack?: string } {
    try {
      if (error instanceof Error) {
        return {
          name: error.name || "Error",
          message: this.truncate(error.message || "Unknown error", this.MAX_MESSAGE_LENGTH),
          stack: error.stack || undefined,
        };
      }

      // Handle non-Error objects
      const stringified = this.safeStringify(error);
      return {
        name: "NonErrorException",
        message: this.truncate(stringified, this.MAX_MESSAGE_LENGTH),
        stack: undefined,
      };
    } catch (e) {
      return {
        name: "SerializationError",
        message: "Failed to serialize error",
        stack: undefined,
      };
    }
  }

  /**
   * Safe stringify with circular reference protection
   */
  private safeStringify(obj: unknown): string {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      });
    } catch (e) {
      return String(obj);
    }
  }

  /**
   * Build telemetry event with API format
   */
  private buildEvent(error: unknown, context: ITelemetryContext): ITelemetryEvent {
    const errorInfo = this.extractErrorInfo(error);

    // Build metadata from context.metadata and additional fields
    const metadata: Record<string, any> = {
      ...(context.metadata || {}),
    };

    if (metadata.error === undefined) {
      metadata.error = error;
    }

    // Add url if available
    if (typeof window !== "undefined") {
      metadata.url = window.location.href;
    }

    // Build the event payload matching the API format
    const event: ITelemetryEvent = {
      platform: this.config.platform,
      platform_version: this.config.platform_version,
      env: this.config.mode,
      feature: context.feature || "unknown",
      level: "error",
      message: errorInfo.message,
      name: errorInfo.name,
      metadata,
    };

    // Add optional fields if present
    if (context.tenant_id) event.tenant_id = context.tenant_id;
    if (context.request_id) event.request_id = context.request_id;
    if (context.process_id) event.process_id = context.process_id;
    if (context.user_id) event.user_id = context.user_id;
    if (errorInfo.stack) event.stack = errorInfo.stack;
    if (context.error_code) event.error_code = context.error_code;
    if (context.http_status) event.http_status = context.http_status;

    return event;
  }

  /**
   * Truncate string to max length
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  }

  /**
   * Send event immediately (fire-and-forget)
   */
  private sendEvent(event: ITelemetryEvent): void {
    // Fire-and-forget: don't wait for the promise
    this.sendHttpRequest(event)
      .then(() => {})
      .catch(() => {
        // Silent failure - never throw
      });
  }

  /**
   * Send HTTP request to telemetry endpoint
   */
  private async sendHttpRequest(event: ITelemetryEvent): Promise<boolean> {
    try {
      const payload = JSON.stringify(event);

      // // Try sendBeacon first (best for page unload scenarios)
      // if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      //   const blob = new Blob([payload], { type: "application/json" });
      //   const sent = navigator.sendBeacon(this.config.endpoint, blob);
      //   if (sent) return true;
      // }

      // Fallback to fetch with keepalive and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${this.config.apiKey}`,
          },
          body: payload,
          keepalive: true,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        return false;
      }
    } catch (e) {
      return false;
    }
  }

}
