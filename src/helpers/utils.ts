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

// The backends take a card payment method in any case; a card payment is the one with none.
export const isCardPaymentMethod = (paymentMethod?: string) =>
  !paymentMethod || paymentMethod.toLowerCase() === "card";

// Mirrors APM_TYPES of usrv-transactions-core (src/domain/payment/Apms.ts): the APMs the core charges,
// in any case and untrimmed; the code goes to the core as written.
const CORE_APM_TYPES = [
  "OXXOPAY",
  "MERCADOPAGO",
  "SAFETYPAYCASH",
  "SAFETYPAYTRANSFER",
  "NEOSURF",
  "QR",
  "TRANSFER",
];

export const isCoreApm = (paymentMethod?: string) =>
  !!paymentMethod && CORE_APM_TYPES.includes(paymentMethod.toUpperCase());

// What the core answers as a payment's method type: anything but a card or Apple Pay is an APM.
export const isApmTypeAnswer = (type?: string) =>
  !!type && !["CARD", "APPLE_PAY"].includes(type.toUpperCase());

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
