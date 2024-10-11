import { IConfigureCheckout, IInlineCheckoutBaseOptions } from "./commons";
import {
  ICustomerCardsResponse,
  ISaveCardRequest,
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
  GetBusinessResponse,
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
   * @property {import("./index").IStartCheckoutErrorResponse} error.details - The response body from the server when an error occurs.
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
   * Saves a card to a customer's account. This method can be used to add a new card
   * or update an existing one.
   * @param {import("./index").ISaveCardRequest} card - The card information to be saved.
   * @returns {Promise<import("./index").ISaveCardResponse>} A promise that resolves with the saved card data.
   *
   * @throws {import("./index").IPublicError} Throws an error object if the operation fails.
   *
   * @public
   */
  saveCustomerCard(card: ISaveCardRequest): Promise<ISaveCardResponse>;

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
}

