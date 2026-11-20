import { PaymentEngine } from "../types/core";
import { AppError, buildPublicAppError, buildPublicAppErrorFromAnswer } from "../shared/utils/appError";
import { CustomerRegisterResponse } from "../types/responses";
import { ICustomerCardsResponse, ISaveCardInternalResponse } from "../types/card";
import { IPaymentMethodResponse } from "../types/paymentMethod";

/*
 * The core's support routes answer its own public contract. These functions turn each answer
 * into what the monolith's route answered, so everything the SDK returns to merchants keeps
 * its fields and types.
 */

export function fromCoreCustomer(body: any): CustomerRegisterResponse {
  return {
    id: body.customer_id,
    email: body.email,
    auth_token: body.auth_token,
    first_name: body.first_name,
    last_name: body.last_name,
  };
}

export function fromCoreCards(body: any): ICustomerCardsResponse {
  return {
    user_id: body.customer_id,
    cards: (body.data ?? []).map((card: any) => ({
      fields: {
        card_number: card.card_number,
        expiration_month: card.expiration_month,
        expiration_year: card.expiration_year,
        skyflow_id: card.id,
        card_scheme: card.card_scheme,
        subscription_id: card.subscription_id ?? undefined,
      },
    })),
  } as ICustomerCardsResponse;
}

export function fromCoreSavedCard(body: any): ISaveCardInternalResponse {
  return {
    skyflow_id: body.id,
    user_id: body.customer_id,
    ...(body.card_bin ? { card_bin: body.card_bin } : {}),
  };
}

/** The core's list is never paged: the monolith's paged envelope is rebuilt around it. */
export function fromCorePaymentMethods(body: any): IPaymentMethodResponse {
  const results = (body.data ?? []).map((method: any) => ({ ...method, pk: method.id }));
  return { count: results.length, next: null, previous: null, results };
}

/**
 * The core's error is `{ error: { code, ... }, request_id }`: its `code` becomes the body's own
 * `code`, where an error's system error is read from, as it was with the monolith's body.
 */
export function fromCoreErrorBody(body: any): unknown {
  if (!body?.error?.code) return body;
  return {
    code: body.error.code,
    message: body.error.message,
    details: body.error.details,
    request_id: body.request_id,
  };
}

/** The error of a refused support call, from the monolith's body or the core's. */
export async function buildSupportError(
  response: Response,
  errorCode: string,
  engine: PaymentEngine,
): Promise<AppError> {
  if (engine !== "core") return buildPublicAppError({ response, errorCode });
  const body = await response.clone().json().catch(() => undefined);
  return buildPublicAppErrorFromAnswer({
    errorCode,
    status: response.status,
    statusText: response.statusText,
    body: fromCoreErrorBody(body),
  });
}
