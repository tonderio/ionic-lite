import { GetBusinessResponse } from "../types/responses";
import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import { buildPublicAppError } from "../shared/utils/appError";

export async function fetchBusiness(
  coreBaseUrl: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<GetBusinessResponse> {
  const response = await fetch(
    `${coreBaseUrl}${API_ENDPOINTS.CORE_BUSINESS_CONFIG}`,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      signal,
    },
  );
  if (response.ok) return await response.json();
  throw await buildPublicAppError({
    response,
    errorCode: ErrorKeyEnum.FETCH_BUSINESS_ERROR,
  });
}
