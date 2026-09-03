/**
 * Static asset host by environment mode.
 *
 * Production keeps pointing at the legacy CloudFront distribution because
 * merchants running already-published versions of the SDK still resolve their
 * logos and card art from it. Every other mode uses the staging distribution.
 */
export const ASSET_BASE_URL_BY_MODE = Object.freeze({
  production: "https://d35a75syrgujp0.cloudfront.net",
  sandbox: "https://static.staging.tonder.io",
  stage: "https://static.staging.tonder.io",
  development: "https://static.staging.tonder.io",
});

/**
 * Get the static asset base URL for a given mode
 */
export function getAssetBaseUrl(
  mode: "production" | "sandbox" | "stage" | "development" = "stage"
): string {
  return ASSET_BASE_URL_BY_MODE[mode] || ASSET_BASE_URL_BY_MODE["stage"];
}
