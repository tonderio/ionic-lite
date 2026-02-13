import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
  buildPublicAppError,
} from "../shared/utils/appError";

export async function getVaultToken(
  baseUrl: string,
  apiKey: string,
  signal = null,
) {
  const response = await fetch(`${baseUrl}/api/v1/vault-token/`, {
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

  throw await buildPublicAppError({
    response,
    errorCode: ErrorKeyEnum.VAULT_TOKEN_ERROR,
  });
}
