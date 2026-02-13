import {
  buildPublicAppError,
} from "../shared/utils/appError";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {IPaymentMethodResponse} from "../types/paymentMethod";

export async function fetchCustomerPaymentMethods(
  baseUrl: string,
  apiKey: string,
  params = {
    status: "active",
    pagesize: "10000",
  },
  signal = null,
): Promise<IPaymentMethodResponse> {
  const queryString = new URLSearchParams(params).toString();

  const response = await fetch(
    `${baseUrl}/api/v1/payment_methods?${queryString}`,
    {
      method: "GET",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
    },
  );

  if (response.ok) return await response.json();
  throw await buildPublicAppError({
    response,
    errorCode: ErrorKeyEnum.FETCH_PAYMENT_METHODS_ERROR,
  });
}
