import { ErrorResponse } from "../classes/errorResponse";
import {IErrorResponse} from "../types/responses";

export const getBrowserInfo = () => {
  const browserInfo = {
    javascript_enabled: true, // Assumed since JavaScript is running
    time_zone: new Date().getTimezoneOffset(),
    language: navigator.language || "en-US", // Fallback to 'en-US'
    color_depth: window.screen ? window.screen.colorDepth : null,
    screen_width: window.screen
      ? window.screen.width * window.devicePixelRatio || window.screen.width
      : null,
    screen_height: window.screen
      ? window.screen.height * window.devicePixelRatio || window.screen.height
      : null,
    user_agent: navigator.userAgent,
  };
  return browserInfo;
};

export const getBusinessId = (merchantData: any) => {
  return merchantData && "business" in merchantData
    ? merchantData?.business?.pk
    : "";
};
const buildErrorResponseFromCatch = (e: any): ErrorResponse => {
  const error = new ErrorResponse({
    code: e?.status ? e.status : e.code,
    body: e?.body,
    name: e ? (typeof e == "string" ? "catch" : (e as Error).name) : "Error",
    message: e ? (typeof e == "string" ? e : (e as Error).message) : "Error",
    stack: typeof e == "string" ? undefined : (e as Error).stack,
  });

  return error;
};

const buildErrorResponse = async (
  response: Response,
  stack: string | undefined = undefined,
): Promise<ErrorResponse> => {
  let body,
    status,
    message = "Error";

  if (response && "json" in response) {
    body = await response?.json();
  }

  if (response && "status" in response) {
    status = response.status.toString();
  }

  if (!body && response && "text" in response) {
    message = await response.text();
  }

  if (body?.detail) {
    message = body.detail;
  }
  const error = new ErrorResponse({
    code: status,
    body: body,
    name: status,
    message: message,
    stack,
  } as IErrorResponse);

  return error;
};

function formatPublicErrorResponse(data: Record<string, any>, error: any) {
  let code = 200;
  try {
    code = Number(error?.code || 200);
  } catch {}

  const default_res = {
    status: "error",
    code,
    message: "",
    detail:
      error?.body?.detail ||
      error?.body?.error ||
      error.body ||
      "Ocurrio un error inesperado.",
  };

  return {
    ...default_res,
    ...data,
  };
}

const clearSpace = (text: string) => {
  return text.trim().replace(/\s+/g, "");
};

const getCardType = (scheme: string) => {
  if (scheme === "Visa") {
    // Check if visa
    return "https://d35a75syrgujp0.cloudfront.net/cards/visa.png";
  } else if (scheme === "Mastercard") {
    // Check if master
    return "https://d35a75syrgujp0.cloudfront.net/cards/mastercard.png";
  } else if (scheme === "American Express") {
    // Check if amex
    return "https://d35a75syrgujp0.cloudfront.net/cards/american_express.png";
  } else {
    return "https://d35a75syrgujp0.cloudfront.net/cards/default_card.png";
  }
};

export {
  buildErrorResponseFromCatch,
  buildErrorResponse,
  getCardType,
  formatPublicErrorResponse,
  clearSpace,
};
