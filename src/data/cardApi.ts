import { MESSAGES_EN } from "../shared/constants/messages";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
  buildPublicAppError,
} from "../shared/utils/appError";
import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import {fromCoreCards, fromCoreSavedCard, buildSupportError} from "../helpers/coreSupport";
import {ISupportTarget} from "../types/core";
import {ICustomerCardsResponse, ISaveCardInternalResponse, ISaveCardSkyflowRequest} from "../types/card";

// The core takes the business from the credential, never from the path.
function cardsUrl(target: ISupportTarget, businessId: string | number, skyflowId = ""): string {
  return target.engine === "core"
    ? `${target.baseUrl}${API_ENDPOINTS.CORE_CARDS}${skyflowId && `/${skyflowId}`}`
    : `${target.baseUrl}/api/v1/business/${businessId}/cards/${skyflowId}`;
}

export async function fetchCustomerCards(
  target: ISupportTarget,
  customerToken: string,
  secureToken: string,
  businessId: string | number,
  signal = null,
): Promise<ICustomerCardsResponse> {
  const url = cardsUrl(target, businessId);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secureToken}`,
      "Content-Type": "application/json",
      'User-token': customerToken,
    },
    signal,
  });
  if (response.ok) {
    const body = await response.json();
    return target.engine === "core" ? fromCoreCards(body) : body;
  }
  if (response.status === 401) {
    return {
      user_id: 0,
      cards: [],
    };
  }

  throw await buildSupportError(response, ErrorKeyEnum.FETCH_CARDS_ERROR, target.engine);
}

export async function saveCustomerCard(
  target: ISupportTarget,
  customerToken: string,
  secureToken: string,
  businessId: string | number,
  data: ISaveCardSkyflowRequest,
  appOrigin: boolean = false,
): Promise<ISaveCardInternalResponse> {
  const url = cardsUrl(target, businessId);
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

  if (response.ok) {
    const body = await response.json();
    return target.engine === "core" ? fromCoreSavedCard(body) : body;
  }

  throw await buildSupportError(response, ErrorKeyEnum.SAVE_CARD_ERROR, target.engine);
}

export async function removeCustomerCard(
  target: ISupportTarget,
  customerToken: string,
  secureToken: string,
  skyflowId = "",
  businessId: string | number,
): Promise<string> {
  const url = cardsUrl(target, businessId, skyflowId);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${secureToken}`,
      "Content-Type": "application/json",
      'User-token': customerToken,
    },
  });

  if (response.status === 204) return MESSAGES_EN[ErrorKeyEnum.CARD_REMOVED_SUCCESSFULLY];
  if (response.ok && "json" in response) return await response.json();

  throw await buildSupportError(response, ErrorKeyEnum.REMOVE_CARD_ERROR, target.engine);
}
