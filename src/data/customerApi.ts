import {CustomerRegisterResponse} from "../types/responses";
import {fromCoreCustomer, buildSupportError} from "../helpers/coreSupport";
import {ISupportTarget} from "../types/core";
import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
  buildPublicAppError,
} from "../shared/utils/appError";

export async function registerOrFetchCustomer(
  target: ISupportTarget,
  apiKey: string,
  customer: Record<string, any>,
  signal: AbortSignal | null = null,
): Promise<CustomerRegisterResponse> {
  const url =
    target.engine === "core"
      ? `${target.baseUrl}${API_ENDPOINTS.CORE_CUSTOMER}`
      : `${target.baseUrl}/api/v1/customer/`;
  const data = {
    email: customer.email,
    first_name: customer?.firstName,
    last_name: customer?.lastName,
    phone: customer?.phone,
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
    signal: signal,
    body: JSON.stringify(data),
  });

  if (response.ok) {
    const body = await response.json();
    return target.engine === "core" ? fromCoreCustomer(body) : body;
  }

  throw await buildSupportError(response, ErrorKeyEnum.CUSTOMER_OPERATION_ERROR, target.engine);
}
