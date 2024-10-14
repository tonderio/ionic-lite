import {
  buildErrorResponse,
  buildErrorResponseFromCatch,
} from "../helpers/utils";
import { MESSAGES } from "../shared/constants/messages";
import {ICustomerCardsResponse, ISaveCardResponse, ISaveCardSkyflowRequest} from "../types/card";

export async function fetchCustomerCards(
  baseUrl: string,
  customerToken: string,
  businessId: string | number,
  signal = null,
): Promise<ICustomerCardsResponse> {
  try {
    const url = `${baseUrl}/api/v1/business/${businessId}/cards/`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${customerToken}`,
        "Content-Type": "application/json",
      },
      signal,
    });
    if (response.ok) return await response.json();
    const res_json = await response.json();

    throw await buildErrorResponse(response, res_json);
  } catch (error) {
    throw buildErrorResponseFromCatch(error);
  }
}

export async function saveCustomerCard(
  baseUrl: string,
  secureToken: string,
  customerToken: string,
  businessId: string | number,
  data: ISaveCardSkyflowRequest,
): Promise<ISaveCardResponse> {
  try {
    const url = `${baseUrl}/api/v1/business/${businessId}/cards/`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secureToken}`,
        "Content-Type": "application/json",
        'User-token': customerToken,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) return await response.json();

    const res_json = await response.json();

    throw await buildErrorResponse(response, res_json);
  } catch (error) {
    throw buildErrorResponseFromCatch(error);
  }
}

export async function removeCustomerCard(
  baseUrl: string,
  customerToken: string,
  skyflowId = "",
  businessId: string | number,
): Promise<string> {
  try {
    const url = `${baseUrl}/api/v1/business/${businessId}/cards/${skyflowId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${customerToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204) return MESSAGES.cardSaved;
    if (response.ok && "json" in response) return await response.json();
    const res_json = await response.json();

    throw await buildErrorResponse(response, res_json);
  } catch (error) {
    throw buildErrorResponseFromCatch(error);
  }
}
