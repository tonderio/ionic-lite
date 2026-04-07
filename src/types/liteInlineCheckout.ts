import { IConfigureCheckout } from "./commons";
import {
  ICustomerCardsResponse,
  IRevealCardFieldsRequest,
  ISaveCardResponse,
} from "./card";
import { IPaymentMethod } from "./paymentMethod";
import { IProcessPaymentRequest, IStartCheckoutResponse } from "./checkout";
import { ITransaction } from "./transaction";
import { APM } from "./commons";
import { ErrorResponse } from "../classes/errorResponse";
import {
  CreateOrderRequest,
  CreatePaymentRequest,
  RegisterCustomerCardRequest,
  StartCheckoutFullRequest,
  StartCheckoutIdRequest,
  StartCheckoutRequest,
  TokensRequest,
} from "./requests";
import {
  CreateOrderResponse,
  CreatePaymentResponse,
  CustomerRegisterResponse,
  GetBusinessResponse, GetSecureTokenResponse,
  RegisterCustomerCardResponse,
  StartCheckoutResponse,
} from "./responses";

export interface ILiteCheckout {

  /**
   * The configureCheckout function allows you to set initial information, such as the customer's email, which is used to retrieve a list of saved cards.
   * @param {import("./index").IConfigureCheckout} data - Configuration data including customer information and potentially other settings.
   * @returns {Promise<void>}.
   * @public
   */
  configureCheckout(data: IConfigureCheckout): void;

  /**
   * Initializes and prepares the checkout for use.
   * This method set up the initial environment.
   * @returns {Promise<void>} A promise that resolves when the checkout has been initialized.
   * @throws {Error} If there's any problem during the checkout initialization.
   * @public
   */
  injectCheckout(): Promise<void>;

  /**
   * Processes a payment.
   * @param {import("./index").IProcessPaymentRequest} data - Payment data including customer, cart, and other relevant information.
   * @returns {Promise<import("./index").IStartCheckoutResponse>} A promise that resolves with the payment response or 3DS redirect or is rejected with an error.
   *
   * @throws {Error} Throws an error if the checkout process fails. The error object contains
   * additional `details` property with the response from the server if available.
   *
   * @public
   */
  payment(data: IProcessPaymentRequest): Promise<IStartCheckoutResponse>;

  /**
   * Verifies the 3DS transaction status.
   * @returns {Promise<import("./index").ITransaction | import("./index").IStartCheckoutResponse | void>} The result of the 3DS verification and checkout resumption.
   * @public
   */
  verify3dsTransaction(): Promise<ITransaction | IStartCheckoutResponse | void>;

  /**
   * Retrieves the list of cards associated with a customer.
   * @returns {Promise<import("./index").ICustomerCardsResponse>} A promise that resolves with the customer's card data.
   *
   * @throws {import("./index").IPublicError} Throws an error object if the operation fails.
   *
   * @public
   */
  getCustomerCards(): Promise<ICustomerCardsResponse>;

  /**
   * Saves a card to a customer's account using card data collected via Skyflow Elements.
   *
   * **Requires** that `mountCardFields()` was called first with all five fields
   * (`cardholder_name`, `card_number`, `expiration_month`, `expiration_year`, `cvv`)
   * and that the user has filled them in before calling this method.
   *
   * @returns {Promise<import("./index").ISaveCardResponse>} A promise that resolves with the saved card data.
   *
   * @throws {import("./index").IPublicError} Throws an error object if the operation fails.
   *
   * @public
   */
  saveCustomerCard(): Promise<ISaveCardResponse>;

  /**
   * Removes a card from a customer's account.
   * @param {string} skyflowId - The unique identifier of the card to be deleted.
   * @returns {Promise<string>} A promise that resolves when the card is successfully deleted.
   *
   * @throws {import("./index").IPublicError} Throws an error object if the operation fails.
   *
   * @public
   */
  removeCustomerCard(skyflowId: string): Promise<string>;

  /**
   * Retrieves the list of available Alternative Payment Methods (APMs).
   * @returns {Promise<import("./index").IPaymentMethod[]>} A promise that resolves with the list of APMs.
   *
   * @throws {import("./index").IPublicError} Throws an error object if the operation fails.
   *
   * @public
   */
  getCustomerPaymentMethods(): Promise<IPaymentMethod[]>;

  /**
   * Retrieves security token to access the saved cards functionality.
   * @param {string} secretApikey
   * @returns {Promise<import("./index").GetSecureTokenResponse>} A promise that resolves with the token.
   *
   * @throws {import("./index").IPublicError} Throws an error object if the operation fails.
   *
   * @public
   */
  getSecureToken(secretApikey: string): Promise<GetSecureTokenResponse>

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * It is no longer necessary to use this method, now automatically handled
   * during the payment process or when using card management methods.
   *
   * Retrieves the business information.
   * @returns {Promise<import("./index").GetBusinessResponse>} A promise that resolves with the business information.
   *
   * @throws {import("./index").IPublicError} Throws an error object if the operation fails.
   *
   * @public
   */
  getBusiness(): Promise<GetBusinessResponse>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * It is no longer necessary to use this method as customer registration is now automatically handled
   * during the payment process or when using card management methods.
   */
  customerRegister(
    email: string,
  ): Promise<CustomerRegisterResponse | ErrorResponse>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * It is no longer necessary to use this method as order creation is now automatically
   * handled when making a payment through the `payment` function.
   */
  createOrder(
    orderItems: CreateOrderRequest,
  ): Promise<CreateOrderResponse | ErrorResponse>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * It is no longer necessary to use this method as payment creation is now automatically
   * handled when making a payment through the `payment` function.
   */
  createPayment(
    paymentItems: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse | ErrorResponse>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * Use the {@link payment} method
   */
  startCheckoutRouter(
    routerData: StartCheckoutRequest | StartCheckoutIdRequest,
  ): Promise<StartCheckoutResponse | ErrorResponse | undefined>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * Use the {@link payment} method
   */
  startCheckoutRouterFull(
    routerFullData: StartCheckoutFullRequest,
  ): Promise<StartCheckoutResponse | ErrorResponse | undefined>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * Use the {@link saveCustomerCard} method
   */
  registerCustomerCard(
    secureToken: string,
    customerToken: string,
    data: RegisterCustomerCardRequest,
  ): Promise<RegisterCustomerCardResponse | ErrorResponse>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * Use the {@link removeCustomerCard} method
   */
  deleteCustomerCard(
    customerToken: string,
    skyflowId: string,
  ): Promise<Boolean | ErrorResponse>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * Use the {@link getCustomerPaymentMethods} method
   */
  getActiveAPMs(): Promise<APM[]>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * It is no longer necessary to use this method as card registration or as checkout is now automatically handled
   * during the payment process or when using card management methods.
   */
  getSkyflowTokens({
    vault_id,
    vault_url,
    data,
  }: TokensRequest): Promise<any | ErrorResponse>;

  /**
   * @deprecated This method is deprecated and will be removed in a future release.
   * It is no longer necessary to use this method is now automatically handled
   * during the payment process.
   */
  getOpenpayDeviceSessionID(
    merchant_id: string,
    public_key: string,
    is_sandbox: boolean,
  ): Promise<string | ErrorResponse>;

  /**
   * Mounts Skyflow Elements (secure iframes) into developer-provided `<div>` containers.
   *
   * **New card form** (omit `card_id`): mount all 5 fields before calling `payment()` or
   * `saveCustomerCard()`. Place divs with default IDs: `collect_cardholder_name`,
   * `collect_card_number`, `collect_expiration_month`, `collect_expiration_year`, `collect_cvv`.
   *
   * **Saved-card CVV** (provide `card_id`): mount only `cvv` for a specific saved card before
   * calling `payment()`. Default div ID: `collect_cvv_<card_id>`.
   *
   * Custom container IDs can be set via `{ field, container_id }` object form per field entry.
   *
   * @param {import("./card").IMountCardFieldsRequest} event - Configuration for the fields to render.
   * @returns {Promise<void>} Resolves when the fields have been successfully rendered.
   * @public
   */
  mountCardFields(event: import("./card").IMountCardFieldsRequest): Promise<void>;

  /**
   * Unmounts card input fields from the DOM.
   * @param {string} context - Optional. Context to unmount: 'all' (default), 'create', 'current', or 'update:card_id'.
   * @returns {void}
   * @public
   */
  unmountCardFields(context?: string): void;

  /**
   * Reveals card data (from the last `saveCustomerCard()` or `payment()` with a new card)
   * in developer-provided `<div>` containers using Skyflow Reveal Elements (secure iframes).
   *
   * Must be called **after** a successful `saveCustomerCard()` or `payment()` that processed
   * a new card. The SDK stores the Skyflow tokens from that collect operation internally.
   *
   * **Default container IDs:** `#reveal_<field>` (e.g. `#reveal_card_number`).
   *
   * **Redaction by field (fixed, cannot be overridden):**
   * - `card_number` → `MASKED` (e.g. `4111 11•• •••• 1234`)
   * - `cardholder_name`, `expiration_month`, `expiration_year` → `PLAIN_TEXT`
   *
   * > CVV cannot be revealed — PCI DSS 3.2.1 prohibits storing or displaying CVV post-authorization.
   *
   * @param request - Fields to reveal, plus optional styles, redaction level, and altText per field.
   * @returns {Promise<void>} Resolves when all Reveal Elements have been mounted and `reveal()` called.
   * @public
   *
   * @example
   * ```typescript
   * // After successful saveCustomerCard():
   * await liteCheckout.revealCardFields({
   *   fields: ['card_number', 'cardholder_name', 'expiration_month', 'expiration_year']
   * });
   * // → renders masked card info in #reveal_card_number, #reveal_cardholder_name, etc.
   * ```
   */
  revealCardFields(request: IRevealCardFieldsRequest): Promise<void>;
}
