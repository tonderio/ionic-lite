export interface AcquirerInstance {
  requestSecureInit: (
    params: SecureInitParams,
    callback: (response: SecureInitResponse | AcquirerErrorResponse) => void
  ) => void;
  requestValidate3DS: (
    params: Validate3DSParams,
    callback: (response: Validate3DSResponse | AcquirerErrorResponse) => void
  ) => void;
}

export interface SecureInitParams {
  card: {
    number: string;
  };
}

export interface SecureInitResponse {
  jwt: string;
}

export interface Validate3DSParams {
  secureId: string;
  security: SecurityInfo;
}

export interface Validate3DSResponse {
  code?: string;
  message?: string;
  isValid?: boolean;
}

export interface AcquirerErrorResponse {
  code: string;
  message: string;
}

export interface SecurityInfo {
  acsURL: string;
  authenticationTransactionId: string;
  authRequired: boolean;
  paReq: string;
  specificationVersion: string;
}

export interface CardOnFileTokenRequest {
  card: {
    name: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
  currency: string;
  jwt: string;
}

export interface CardOnFileTokenResponse {
  token: string;
  secureId?: string;
  secureService?: string;
  security?: SecurityInfo;
  details?: {
    secureId?: string;
    security?: SecurityInfo;
  };
}

export interface CardOnFileSubscriptionRequest {
  token: string;
  contactDetails: {
    firstName: string;
    lastName: string;
    email: string;
  };
  metadata: {
    customerId: string;
    notes?: string;
  };
  currency: string;
}

export interface CardOnFileSubscriptionResponse {
  details: {
    amount: {
      subtotalIva: number;
      subtotalIva0: number;
      ice: number;
      iva: number;
      currency: string;
    };
    binCard: string;
    binInfo: {
      bank: string;
      type: string;
    };
    cardHolderName: string;
    contactDetails: {
      firstName: string;
      lastName: string;
      email: string;
    };
    created: string;
    lastFourDigits: string;
    maskedCreditCard: string;
    merchantId: string;
    merchantName: string;
    paymentBrand: string;
    periodicity: string;
    planName: string;
    processorBankName: string;
    startDate: string;
  };
  subscriptionId: string;
}

export interface SkyflowCollectFields {
  card_number: string;
  cvv: string;
  expiration_month: string;
  expiration_year: string;
  cardholder_name: string;
  skyflow_id: string;
  [key: string]: string;
}

export interface SkyflowCollectRecord {
  fields: SkyflowCollectFields;
}

export interface SkyflowCollectResponse {
  records?: SkyflowCollectRecord[];
}

export interface CardTokens {
  name: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface ContactDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProcessParams {
  cardTokens: CardTokens;
  cardBin: string;
  contactDetails: ContactDetails;
  customerId: string;
  currency: string;
}
