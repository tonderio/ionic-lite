import { GetSecureTokenResponse } from "../types/responses";
import {
  buildPublicAppError,
} from "../shared/utils/appError";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";

export async function getSecureToken(
  baseUrl: string,
  token: string,
  signal = null,
): Promise<GetSecureTokenResponse> {
  const response = await fetch(`${baseUrl}/api/secure-token/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    signal,
  });

  if (response.ok) return (await response.json()) as GetSecureTokenResponse;
  throw await buildPublicAppError({
    response,
    errorCode: ErrorKeyEnum.SECURE_TOKEN_ERROR,
  });
}
