/**
 * Telemetry configuration for SDK error reporting
 */
export interface ITelemetryConfig {
  endpoint: string;
  apiKey: string;
  platform: string; // SDK name from package.json (e.g., "@tonder.io/ionic-lite-sdk")
  platform_version: string; // SDK version from package.json
  mode: "production" | "sandbox" | "stage" | "development";
}

/**
 * Context data for telemetry events - passed when capturing an exception
 */
export interface ITelemetryContext {
  tenant_id?: string; // business_id
  feature?: string;
  request_id?: string; // correlation id per SDK instance
  process_id?: string; // payment_id, card_id (skyflow_id), transaction_id, checkout_id
  user_id?: string; // customer auth_token or email
  error_code?: string;
  http_status?: number;
  step?: string;
  metadata?: Record<string, any>; // Additional data: request, response, transaction_id, amount, currency, etc.
  [key: string]: any; // Allow additional context fields
}

/**
 * Telemetry event payload sent to the backend (API format)
 */
export interface ITelemetryEvent {
  tenant_id?: string; // business_id
  platform: string; // SDK name from package.json
  platform_version: string; // SDK version from package.json
  env: string; // mode: production, sandbox, stage, development
  feature: string;
  level: "error";
  request_id?: string; // correlation id per SDK instance
  process_id?: string; // payment_id, card_id, transaction_id, checkout_id
  user_id?: string; // customer ID
  stack?: string;
  message: string;
  name: string;
  error_code?: string;
  http_status?: number;
  metadata?: Record<string, any>;
}

/**
 * Circuit breaker state
 */
export interface ICircuitBreakerState {
  failureCount: number;
  isOpen: boolean;
  openUntil: number | null;
}
