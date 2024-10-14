import {CustomerRegisterResponse} from "../types/responses";

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

  if (response.status === 201) {
    return await response.json();
  } else {
    throw new Error(`Error: ${response.statusText}`);
  }
}
