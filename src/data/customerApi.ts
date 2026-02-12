import {CustomerRegisterResponse} from "../types/responses";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
  buildPublicAppError,
} from "../shared/utils/appError";

export async function registerOrFetchCustomer(
  baseUrl: string,
  apiKey: string,
  customer: Record<string, any>,
  signal: AbortSignal | null = null,
): Promise<CustomerRegisterResponse> {
  const url = `${baseUrl}/api/v1/customer/`;
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
    return await response.json();
  }

  throw await buildPublicAppError({
    response,
    errorCode: ErrorKeyEnum.CUSTOMER_OPERATION_ERROR,
  });
}
