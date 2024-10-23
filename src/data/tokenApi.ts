import { GetSecureTokenResponse } from "../types/responses";
import {
  buildErrorResponse,
  buildErrorResponseFromCatch,
} from "../helpers/utils";

export async function getSecureToken(
  baseUrl: string,
  token: string,
  signal = null,
): Promise<GetSecureTokenResponse> {
  try {
    const response = await fetch(`${baseUrl}/api/secure-token/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      signal,
    });

    if (response.ok) return (await response.json()) as GetSecureTokenResponse;
    throw await buildErrorResponse(response);
  } catch (error) {
    throw buildErrorResponseFromCatch(error);
  }
}
