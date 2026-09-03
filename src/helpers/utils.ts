import { getAssetBaseUrl } from "../shared/constants/assetUrl";

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

const clearSpace = (text: string) => {
  return text.trim().replace(/\s+/g, "");
};

const getCardType = (
  scheme: string,
  mode: "production" | "sandbox" | "stage" | "development" = "stage",
) => {
  const assetBaseUrl = getAssetBaseUrl(mode);
  if (scheme === "Visa") {
    // Check if visa
    return `${assetBaseUrl}/cards/visa.png`;
  } else if (scheme === "Mastercard") {
    // Check if master
    return `${assetBaseUrl}/cards/mastercard.png`;
  } else if (scheme === "American Express") {
    // Check if amex
    return `${assetBaseUrl}/cards/american_express.png`;
  } else {
    return `${assetBaseUrl}/cards/default_card.png`;
  }
};

export {
  getCardType,
  clearSpace,
};
