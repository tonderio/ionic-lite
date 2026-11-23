import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import { buildCoreProcessBody } from "../helpers/corePayment";

export const SDK_APP_ORIGIN = "sdk/ionic";

export type CoreAnswer = { status: number; statusText?: string; body: any };

/**
 * Creates a card payment in the core and answers whatever the core answered, a refusal
 * included: turning an answer into what the merchant sees is `rebuildCheckoutResult`'s job.
 */
export async function createCorePayment(
  coreBaseUrl: string,
  apiKey: string,
  payment: ReturnType<typeof buildCoreProcessBody>,
  requestId: string,
): Promise<CoreAnswer> {
  const response = await fetch(`${coreBaseUrl}${API_ENDPOINTS.CORE_PROCESS}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
      "X-App-Origin": SDK_APP_ORIGIN,
      "X-Request-Id": requestId,
    },
    body: JSON.stringify(payment),
  });

  const body = response.ok ? await response.json() : await response.json().catch(() => undefined);
  return { status: response.status, statusText: response.statusText, body };
}

