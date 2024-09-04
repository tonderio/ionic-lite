import {GetBusinessResponse} from "../types/responses";

export async function fetchBusiness(
  baseUrl: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<GetBusinessResponse> {
  const getBusiness = await fetch(
    `${baseUrl}/api/v1/payments/business/${apiKey}`,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      signal: signal,
    },
  );
  return await getBusiness.json();
}
