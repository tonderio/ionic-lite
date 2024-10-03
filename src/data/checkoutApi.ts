import {CreateOrderRequest, CreatePaymentRequest} from "../types/requests";
import {IStartCheckoutIdRequest, IStartCheckoutRequest} from "../types/checkout";

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
  if (response.status === 201) {
    return await response.json();
  } else {
    throw new Error(`Error: ${response.statusText}`);
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
  if (response.status >= 200 && response.status <= 299) {
    return await response.json();
  } else {
    throw new Error(`Error: ${response.statusText}`);
  }
}

export async function startCheckoutRouter(
  baseUrl: string,
  apiKey: string,
  routerItems: IStartCheckoutRequest | IStartCheckoutIdRequest,
) {
  try {
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
    if (response.status >= 200 && response.status <= 299) {
      return await response.json();
    } else {
      const errorResponse = await response.json();
      const error = new Error("Failed to start checkout router");
      // @ts-ignore
      error.details = errorResponse;
      throw error;
    }
  } catch (error) {
    throw error;
  }
}
