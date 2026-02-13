/**
 * Tonder API base URLs by environment mode
 */
export const API_BASE_URL_BY_MODE = Object.freeze({
  production: "https://api.tonder.io",
  sandbox: "https://api-stage.tonder.io",
  stage: "https://api-stage.tonder.io",
  development: "https://api-stage.tonder.io",
});

/**
 * API endpoint paths
 */
export const API_ENDPOINTS = Object.freeze({
  TELEMETRY: "/telemetry/v1/events",
  ACQ_SUBSCRIPTION_TOKEN: "/acq-kushki/subscription/token",
  ACQ_SUBSCRIPTION_CREATE: "/acq-kushki/subscription/create",
});

/**
 * Get the full telemetry endpoint URL for a given mode
 */
export function getTelemetryEndpoint(
  mode: "production" | "sandbox" | "stage" | "development" = "stage"
): string {
  const baseUrl = API_BASE_URL_BY_MODE[mode];
  return `${baseUrl}${API_ENDPOINTS.TELEMETRY}`;
}

/**
 * Get the API base URL for a given mode
 */
export function getApiBaseUrl(
  mode: "production" | "sandbox" | "stage" | "development" = "stage"
): string {
  return API_BASE_URL_BY_MODE[mode];
}
