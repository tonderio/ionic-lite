import { createTelemetry, type SdkName, type TelemetryClient } from "@tonder.io/client-telemetry";
import { API_ENDPOINTS, getApiBaseUrl } from "../shared/constants/apiEndpoints";
import { AppError } from "../shared/utils/appError";

type Mode = "production" | "sandbox" | "stage" | "development";

export type StepFields = {
  payment_method_type?: string;
  operation_id?: string;
  request_id?: string;
  http_status?: number;
  error_code?: string;
};

// ionic-full builds on this SDK and passes its own package info; the contract names it apart.
function telemetrySdkName(packageName: string): SdkName {
  return packageName.includes("ionic-full") ? "ionic-full" : "ionic-lite";
}

export function createSdkTelemetry(
  mode: Mode,
  apiKey: string,
  sdkInfo: { name: string; version: string },
): TelemetryClient {
  return createTelemetry({
    sdk: { name: telemetrySdkName(sdkInfo.name), version: sdkInfo.version },
    env: mode,
    endpoint: `${getApiBaseUrl(mode)}${API_ENDPOINTS.TELEMETRY}`,
    getAuthorization: () => `Token ${apiKey}`,
  });
}

/** Only codes and statuses: never a message, which can carry what the buyer typed. */
export function errorFields(error: unknown): Pick<StepFields, "error_code" | "http_status"> {
  if (!(error instanceof AppError)) return {};
  const systemError = error.details?.systemError;
  return {
    error_code: typeof systemError === "string" && systemError ? systemError : error.code,
    http_status: error.statusCode,
  };
}

/** `CARD` unless the merchant names another method; normalised to the contract's token shape. */
export function paymentMethodType(paymentMethod?: unknown): string {
  if (typeof paymentMethod !== "string" || !paymentMethod) return "CARD";
  return paymentMethod.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

