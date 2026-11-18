import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import { AppError, buildPublicAppError } from "../shared/utils/appError";
import { buildCoreProcessBody } from "../helpers/corePayment";

export const SDK_APP_ORIGIN = "sdk/ionic";

export type CoreAnswer = { status: number; body: any };

/**
 * Creates a card payment in the core. A route that ended with no transaction answers a
 * normalized 402, which is a payment result, so it is returned; any other refusal throws.
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

  if (response.ok) return { status: response.status, body: await response.json() };

  const refusal = await buildPublicAppError({
    response,
    errorCode: ErrorKeyEnum.START_CHECKOUT_ERROR,
  });
  if (response.status === 402 && coreErrorCode(refusal) === "payment_declined") {
    return { status: 402, body: (refusal.originalError as any).body };
  }
  throw refusal;
}

function coreErrorCode(error: AppError): string | undefined {
  return (error.originalError as any)?.body?.error?.code;
}

/** The kill switch refused the create: nothing was created, so the legacy flow may take over. */
export function isOperationsDisabled(error: unknown): boolean {
  return (
    error instanceof AppError &&
    error.statusCode === 503 &&
    coreErrorCode(error) === "operations_disabled"
  );
}
