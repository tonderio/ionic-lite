import {
  buildPublicAppError,
} from "../shared/utils/appError";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {fromCorePaymentMethods, buildSupportError} from "../helpers/coreSupport";
import {IPaymentMethodResponse} from "../types/paymentMethod";
import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";

export async function fetchCustomerPaymentMethods(
  coreBaseUrl: string,
  apiKey: string,
  params = {
    status: "active",
    pagesize: "10000",
  },
  signal = null,
): Promise<IPaymentMethodResponse> {
  const queryString = new URLSearchParams(params).toString();

  const response = await fetch(
    `${coreBaseUrl}${API_ENDPOINTS.CORE_PAYMENT_METHODS}?${queryString}`,
    {
      method: "GET",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
    },
  );

  if (response.ok) return fromCorePaymentMethods(await response.json());
  throw await buildSupportError(response, ErrorKeyEnum.FETCH_PAYMENT_METHODS_ERROR, "core");
}
