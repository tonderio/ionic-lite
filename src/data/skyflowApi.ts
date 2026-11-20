import { buildSupportError } from "../helpers/coreSupport";
import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
  buildPublicAppError,
} from "../shared/utils/appError";

export async function getVaultToken(
  coreBaseUrl: string,
  apiKey: string,
  signal = null,
) {
  const response = await fetch(`${coreBaseUrl}${API_ENDPOINTS.CORE_VAULT_TOKEN}`, {
    method: "GET",
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    signal: signal,
  });

  if (response.ok) {
    const responseBody = await response.json();
    return responseBody.token;
  }

  throw await buildSupportError(response, ErrorKeyEnum.VAULT_TOKEN_ERROR, "core");
}
