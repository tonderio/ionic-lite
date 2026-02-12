import { ICustomer } from "./customer";
import {IProcessPaymentRequest, IStartCheckoutResponse} from "./checkout";
import CollectorContainer from "skyflow-js/types/core/external/collect/collect-container";
import ComposableContainer from "skyflow-js/types/core/external/collect/compose-collect-container";
import RevealContainer from "skyflow-js/types/core/external/reveal/reveal-container";
import CollectElement from "skyflow-js/types/core/external/collect/collect-element";
import ComposableElement from "skyflow-js/types/core/external/collect/compose-collect-element";
import RevealElement from "skyflow-js/types/core/external/reveal/reveal-element";
import {LabelStyles} from "skyflow-js/types/utils/common";

export type CardOnFileKeys = {
    merchant_id: string;
    public_key: string;
}

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
  cardonfile_keys?: CardOnFileKeys;
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

export interface IConfigureCheckout extends Partial<IProcessPaymentRequest>{
  customer: ICustomer | { email: string };
  secureToken: string
}

export interface IInlineCheckoutBaseOptions<T extends CustomizationOptions = CustomizationOptions> {
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
  customization?: T;
  tdsIframeId?: string,
  tonderPayButtonId?: string
  sdkInfo?: {
    name: string;
    version: string;
  }
}

export interface IInlineLiteCheckoutOptions
    extends IInlineCheckoutBaseOptions {
      collectorIds?: {
          tdsIframe?: string
      }
      customization?: ILiteCustomizationOptions;
      events?: IEvents;
    }

export interface ICardFormEvents {
  cardHolderEvents?: IInputEvents;
  cardNumberEvents?: IInputEvents;
  cvvEvents?: IInputEvents;
  monthEvents?: IInputEvents;
  yearEvents?: IInputEvents;
}
export interface IInputEvents {
  onChange?: (event: IEventSecureInput) => void;
  onFocus?: (event: IEventSecureInput) => void;
  onBlur?: (event: IEventSecureInput) => void;
}
export interface IEventSecureInput {
  elementType: string;
  isEmpty: boolean;
  isFocused: boolean;
  isValid: boolean;
}
export interface IEvents extends ICardFormEvents {}
export interface IApiError {
  code: string;
  body: Record<string, string> | string;
  name: string;
  message: string;
}

export interface IPublicError {
  status: string;
  code: string;
  message: string;
  statusCode: number;
  details: Record<string, any>;
}

export type CustomizationOptions = {
    redirectOnComplete?: boolean
}

export interface InCollectorContainer {
  container: CollectorContainer | ComposableContainer | RevealContainer;
  elements: (CollectElement | ComposableElement | RevealElement)[];
}

export interface ILiteCustomizationOptions extends CustomizationOptions {
  styles?: IStyles;
  labels?: IFormLabels;
  placeholders?: IFormPlaceholder;
}

export interface IFormLabels {
  name?: string;
  card_number?: string;
  cvv?: string;
  expiry_date?: string;
  expiration_year?: string;
  expiration_month?: string;
}

export interface IFormPlaceholder {
  name?: string;
  card_number?: string;
  cvv?: string;
  expiration_month?: string;
  expiration_year?: string;
}

export interface IStyles {
  cardForm?: ILiteCardFormStyles;
}

export interface ILiteCardFormStyles extends StylesBaseVariant, IElementStyle {}

export interface StylesBaseVariant {
  base?: Record<string, any>;
}

export interface IElementStyle {
  inputStyles?: CollectInputStylesVariant;
  labelStyles?: LabelStyles;
  errorStyles?: StylesBaseVariant;
}
export interface StylesFocusVariant {
  focus?: Record<string, any>;
}

export interface CollectInputStylesVariant
    extends StylesBaseVariant,
        StylesFocusVariant {
  complete?: Record<string, any>;
  invalid?: Record<string, any>;
  empty?: Record<string, any>;
  cardIcon?: Record<string, any>;
  dropdownIcon?: Record<string, any>;
  dropdown?: Record<string, any>;
  dropdownListItem?: Record<string, any>;
  global: Record<string, any>;
}

export interface CollectLabelStylesVariant
    extends StylesBaseVariant,
        StylesFocusVariant {
  requiredAsterisk?: Record<string, any>;
}
