import {
  buildErrorResponse,
  buildErrorResponseFromCatch,
} from "../helpers/utils";
import { MESSAGES } from "../shared/constants/messages";
import {ICustomerCardsResponse, ISaveCardInternalResponse, ISaveCardSkyflowRequest} from "../types/card";

export async function fetchCustomerCards(
  baseUrl: string,
  customerToken: string,
  secureToken: string,
  businessId: string | number,
  signal = null,
): Promise<ICustomerCardsResponse> {
  try {
    const url = `${baseUrl}/api/v1/business/${businessId}/cards/`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secureToken}`,
        "Content-Type": "application/json",
        'User-token': customerToken,
      },
      signal,
    });
    if (response.ok) return await response.json();
    if (response.status === 401) {
      return {
        user_id: 0,
        cards: [],
      };
    }

    throw await buildErrorResponse(response);
  } catch (error) {
    throw buildErrorResponseFromCatch(error);
  }
}

export async function saveCustomerCard(
  baseUrl: string,
  customerToken: string,
  secureToken: string,
  businessId: string | number,
  data: ISaveCardSkyflowRequest,
  appOrigin: boolean = false,
): Promise<ISaveCardInternalResponse> {
  try {
    const url = `${baseUrl}/api/v1/business/${businessId}/cards/`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secureToken}`,
        "Content-Type": "application/json",
        'User-token': customerToken,
        ...(appOrigin ? { 'X-App-Origin': 'sdk/ionic' } : {}),
      },
      body: JSON.stringify(data),
    });

    if (response.ok) return await response.json();

    throw await buildErrorResponse(response);
  } catch (error) {
    throw buildErrorResponseFromCatch(error);
  }
}

export async function removeCustomerCard(
  baseUrl: string,
  customerToken: string,
  secureToken: string,
  skyflowId = "",
  businessId: string | number,
): Promise<string> {
  try {
    const url = `${baseUrl}/api/v1/business/${businessId}/cards/${skyflowId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${secureToken}`,
        "Content-Type": "application/json",
        'User-token': customerToken,
      },
    });

    if (response.status === 204) return MESSAGES.removedCard;
    if (response.ok && "json" in response) return await response.json();

    throw await buildErrorResponse(response);
  } catch (error) {
    throw buildErrorResponseFromCatch(error);
  }
}
