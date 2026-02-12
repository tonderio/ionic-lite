import {CreateOrderRequest, CreatePaymentRequest} from "../types/requests";
import {IStartCheckoutIdRequest, IStartCheckoutRequest} from "../types/checkout";
import {
  buildPublicAppError,
} from "../shared/utils/appError";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";

declare const MP_DEVICE_SESSION_ID: string | undefined;


export async function createOrder(
  baseUrl: string,
  apiKey: string,
  orderItems: CreateOrderRequest,
) {
  const url = `${baseUrl}/api/v1/orders/`;
  const data = orderItems;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify(data),
  });
  if (response.ok) {
    return await response.json();
  } else {
    throw await buildPublicAppError({
      response,
      errorCode: ErrorKeyEnum.CREATE_ORDER_ERROR,
    });
  }
}

export async function createPayment(
  baseUrl: string,
  apiKey: string,
  paymentItems: CreatePaymentRequest,
) {
  const url = `${baseUrl}/api/v1/business/${paymentItems.business_pk}/payments/`;
  const data = paymentItems;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify(data),
  });
  if (response.ok) {
    return await response.json();
  } else {
    throw await buildPublicAppError({
      response,
      errorCode: ErrorKeyEnum.CREATE_PAYMENT_ERROR,
    });
  }
}

export async function startCheckoutRouter(
  baseUrl: string,
  apiKey: string,
  routerItems: IStartCheckoutRequest | IStartCheckoutIdRequest,
) {
  const url = `${baseUrl}/api/v1/checkout-router/`;
  const data = routerItems;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      ...data,
      ...(typeof MP_DEVICE_SESSION_ID !== "undefined"
        ? { mp_device_session_id: MP_DEVICE_SESSION_ID }
        : {}),
    }),
  });
  if (response.ok) {
    return await response.json();
  }

  throw await buildPublicAppError({
    response,
    errorCode: ErrorKeyEnum.START_CHECKOUT_ERROR,
  });
}
