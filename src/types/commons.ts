import { ICustomer } from "./customer";
import {IStartCheckoutResponse} from "./checkout";

export type Business = {
  business: {
    pk: number;
    name: string;
    categories: {
      pk: number;
      name: string;
    }[];
    web: string;
    logo: string;
    full_logo_url: string;
    background_color: string;
    primary_color: string;
    checkout_mode: boolean;
    textCheckoutColor: string;
    textDetailsColor: string;
    checkout_logo: string;
  };
  openpay_keys: {
    merchant_id: string;
    public_key: string;
  };
  fintoc_keys: {
    public_key: string;
  };
  mercado_pago: {
    active: boolean;
  };
  vault_id: string;
  vault_url: string;
  reference: number;
  is_installments_available: boolean;
};

export type Customer = {
  firstName: string;
  lastName: string;
  country: string;
  street: string;
  city: string;
  state: string;
  postCode: string;
  email: string;
  phone: string;
};

export type OrderItem = {
  description: string;
  quantity: number;
  price_unit: number;
  discount: number;
  taxes: number;
  product_reference: number;
  name: string;
  amount_total: number;
};

export type PaymentData = {
  customer: Customer;
  currency: string;
  cart: {
    total: string | number;
    items: OrderItem[];
  };
};

export type TonderAPM = {
  pk: string;
  payment_method: string;
  priority: number;
  category: string;
  unavailable_countries: string[];
  status: string;
};

export type APM = {
  id: string;
  payment_method: string;
  priority: number;
  category: string;
  icon: string;
  label: string;
};

export interface IConfigureCheckout {
  customer: ICustomer | { email: string };
  secureToken: string
}

export interface IInlineCheckoutBaseOptions {
  mode?: "production" | "sandbox" | "stage" | "development";
  /**
   * @deprecated This property is deprecated and will be removed in a future release.
   * `baseUrlTonder` is no longer required.
   */
  baseUrlTonder?: string;
  /**
   * @deprecated This property is deprecated and will be removed in a future release.
   * Use `apiKey` instead, as `apiKeyTonder` is no longer required.
   */
  apiKeyTonder?: string;
  /**
   * @deprecated This property is deprecated and will be removed in a future release.
   * `signal` is no longer required.
   */
  signal?: AbortSignal;
  apiKey: string;
  returnUrl?: string;
  callBack?: (response: IStartCheckoutResponse | Record<string, any>) => void;
  customization?: CustomizationOptions;
  tdsIframeId?: string
}

export interface IInlineLiteCheckoutOptions
    extends IInlineCheckoutBaseOptions {}


export interface IApiError {
  code: string;
  body: Record<string, string> | string;
  name: string;
  message: string;
}

export interface IPublicError {
  status: string;
  code: number;
  message: string;
  detail: Record<string, any> | string;
}

export type CustomizationOptions = {
    saveCards?: {
        showSaveCardOption?: boolean;
        showSaved?: boolean;
        autoSave?: boolean;
    },
    redirectOnComplete?: boolean
}
