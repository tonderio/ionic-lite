import { ThreeDSHandler } from "./3dsHandler";
import { ErrorResponse } from "./errorResponse";
import { fetchBusiness } from "../data/businessApi";
import { injectMercadoPagoSecurity } from "../helpers/mercadopago";
import { TONDER_URL_BY_MODE } from "../shared/constants/tonderUrl";
import {
  createOrder,
  createPayment,
  startCheckoutRouter,
} from "../data/checkoutApi";
import { getOpenpayDeviceSessionID } from "../data/openPayApi";
import { getBrowserInfo } from "../helpers/utils";
import { registerOrFetchCustomer } from "../data/customerApi";
import { get } from "lodash";
import {
  fetchCustomerCards,
  removeCustomerCard,
  saveCustomerCard,
} from "../data/cardApi";
import { fetchCustomerPaymentMethods } from "../data/paymentMethodApi";
import {Business, IConfigureCheckout, IInlineCheckoutBaseOptions} from "../types/commons";
import {ICustomer} from "../types/customer";
import {ICardFields, IItem, IProcessPaymentRequest, IStartCheckoutResponse} from "../types/checkout";
import {ICustomerCardsResponse, ISaveCardResponse, ISaveCardSkyflowRequest} from "../types/card";
import {IPaymentMethodResponse} from "../types/paymentMethod";
import {ITransaction} from "../types/transaction";
export class BaseInlineCheckout {
  baseUrl = "";
  cartTotal: string | number = "0";
  process3ds: ThreeDSHandler;
  mode?: "production" | "sandbox" | "stage" | "development" | undefined;
  apiKeyTonder: string;
  returnUrl?: string;
  callBack?: ((response: IStartCheckoutResponse | Record<string, any>) => void) | undefined;
  merchantData?: Business;
  abortController: AbortController;
  secureToken: string | null = null;
  customer?: ICustomer | { email: string };

  cartItems?: IItem[];
  metadata = {};
  card? = {};
  currency?: string = "";

  #customerData?: Record<string, any>;

  constructor({
    mode = "stage",
    apiKey,
    apiKeyTonder,
    returnUrl,
    callBack = () => {},
    baseUrlTonder
  }: IInlineCheckoutBaseOptions) {
    this.apiKeyTonder = apiKeyTonder || apiKey || "";
    this.returnUrl = returnUrl;
    this.callBack = callBack;
    this.mode = mode;
    this.customer = {} as ICustomer
    this.baseUrl = baseUrlTonder || TONDER_URL_BY_MODE[this.mode] || TONDER_URL_BY_MODE["stage"];
    this.abortController = new AbortController();
    this.process3ds = new ThreeDSHandler({
      apiKey: apiKey,
      baseUrl: this.baseUrl,
    });
  }

  configureCheckout(data: IConfigureCheckout) {
    if ("customer" in data) this.#handleCustomer(data["customer"]);
    if ("secureToken" in data) this.#setSecureToken(data["secureToken"]);
  }

  async verify3dsTransaction(): Promise<ITransaction | IStartCheckoutResponse | void> {
    const result3ds = await this.process3ds.verifyTransactionStatus();
    const resultCheckout = await this.#resumeCheckout(result3ds);
    this.process3ds.setPayload(resultCheckout);
    return this._handle3dsRedirect(resultCheckout);
  }

  payment(data: IProcessPaymentRequest): Promise<IStartCheckoutResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        this.#handleCustomer(data.customer);
        this._setCartTotal(data.cart?.total);
        this.#setCartItems(data.cart?.items);
        this.#handleMetadata(data);
        this.#handleCurrency(data);
        this.#handleCard(data);
        const response = await this._checkout(data);
        this.process3ds.setPayload(response);
        if (this.callBack) this.callBack!(response);
        const payload = await this._handle3dsRedirect(response);
        if (payload) {
          resolve(response);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async _initializeCheckout() {
    const business_response = await this._fetchMerchantData();

    if (
      !!business_response &&
      !!business_response.mercado_pago &&
      business_response.mercado_pago.active
    ) {
      injectMercadoPagoSecurity();
    }
  }

  async _checkout(data: any): Promise<any> {
    throw new Error(
      "The #checkout method should be implement in child classes.",
    );
  }

  _setCartTotal(total: string | number) {
    throw new Error(
      "The #setCartTotal method should be implement in child classes.",
    );
  }

  async _getCustomer(signal: AbortSignal | null = null) {
    if (!!this.#customerData) return this.#customerData!;

    this.#customerData = await registerOrFetchCustomer(
      this.baseUrl,
      this.apiKeyTonder,
      this.customer!,
      signal,
    );
    return this.#customerData!;
  }

  async _handleCheckout({
    card,
    payment_method,
    customer,
    isSandbox,
    // TODO: DEPRECATED
    returnUrl: returnUrlData
  }: {
    card?: string;
    payment_method?: string;
    customer: Record<string, any>;
    isSandbox?: boolean;
    returnUrl?: string;
  }) {
    const { openpay_keys, reference, business } = this.merchantData!;
    const total = Number(this.cartTotal);
    try {
      let deviceSessionIdTonder;
      if (
        !deviceSessionIdTonder &&
        openpay_keys.merchant_id &&
        openpay_keys.public_key
      ) {
        deviceSessionIdTonder = await getOpenpayDeviceSessionID(
          openpay_keys.merchant_id,
          openpay_keys.public_key,
          isSandbox,
          this.abortController.signal,
        );
      }

      const { id, auth_token } = customer;

      const orderItems = {
        business: this.apiKeyTonder,
        client: auth_token,
        billing_address_id: null,
        shipping_address_id: null,
        amount: total,
        status: "A",
        reference: reference,
        is_oneclick: true,
        items: this.cartItems!,
      };
      const jsonResponseOrder = await createOrder(
        this.baseUrl,
        this.apiKeyTonder,
        orderItems,
      );

      // Create payment
      const now = new Date();
      const dateString = now.toISOString();

      const paymentItems = {
        business_pk: business.pk,
        client_id: id,
        amount: total,
        date: dateString,
        order_id: jsonResponseOrder.id,
      };
      const jsonResponsePayment = await createPayment(
        this.baseUrl,
        this.apiKeyTonder,
        paymentItems,
      );

      // Checkout router
      const routerItems = {
        name: get(this.customer, "firstName", get(this.customer, "name", "")),
        last_name: get(
          this.customer,
          "lastName",
          get(this.customer, "lastname", ""),
        ),
        email_client: get(this.customer, "email", ""),
        phone_number: get(this.customer, "phone", ""),
        return_url: returnUrlData || this.returnUrl,
        id_product: "no_id",
        quantity_product: 1,
        id_ship: "0",
        instance_id_ship: "0",
        amount: total,
        title_ship: "shipping",
        description: "transaction",
        device_session_id: deviceSessionIdTonder ? deviceSessionIdTonder : null,
        token_id: "",
        order_id: jsonResponseOrder.id,
        business_id: business.pk,
        payment_id: jsonResponsePayment.pk,
        source: "sdk",
        metadata: this.metadata,
        browser_info: getBrowserInfo(),
        currency: this.currency!,
        ...(!!payment_method ? { payment_method } : { card }),
      };

      const jsonResponseRouter = await startCheckoutRouter(
        this.baseUrl,
        this.apiKeyTonder,
        routerItems,
      );

      if (jsonResponseRouter) {
        return jsonResponseRouter;
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async _fetchMerchantData() {
    try {
      if (!this.merchantData) {
        this.merchantData = await fetchBusiness(
          this.baseUrl,
          this.apiKeyTonder,
          this.abortController.signal,
        );
      }
      return this.merchantData;
    } catch (e) {
      return this.merchantData;
    }
  }

  async _getCustomerCards(
    authToken: string,
    businessId: string | number,
  ): Promise<ICustomerCardsResponse> {
    return await fetchCustomerCards(this.baseUrl, authToken, businessId);
  }

  async _saveCustomerCard(
    authToken: string,
    secureToken: string,
    businessId: string | number,
    skyflowTokens: ISaveCardSkyflowRequest,
  ): Promise<ISaveCardResponse> {
    return await saveCustomerCard(
      this.baseUrl,
      secureToken,
      authToken,
      businessId,
      skyflowTokens,
    );
  }

  async _removeCustomerCard(
    authToken: string,
    businessId: string | number,
    skyflowId: string,
  ): Promise<string> {
    return await removeCustomerCard(
      this.baseUrl,
      authToken,
      skyflowId,
      businessId,
    );
  }
  async _fetchCustomerPaymentMethods(): Promise<IPaymentMethodResponse> {
    return await fetchCustomerPaymentMethods(this.baseUrl, this.apiKeyTonder);
  }

  #handleCustomer(customer: ICustomer | { email: string }) {
    if (!customer) return;

    this.customer = customer;
  }

  #setSecureToken(token: string) {
    this.secureToken = token;
  }

  #setCartItems(items: IItem[]) {
    this.cartItems = items;
  }

  #handleMetadata(data: { metadata?: any }) {
    this.metadata = data?.metadata;
  }

  #handleCurrency(data: { currency?: string }) {
    this.currency = data?.currency;
  }

  #handleCard(data: { card?: ICardFields | string }) {
    this.card = data?.card;
  }

  // TODO: Make private after remove deprecated functions of liteCheckout
  async _handle3dsRedirect(
    response: ITransaction | IStartCheckoutResponse | void,
  ) {
    const iframe =
      response && "next_action" in response
        ? response?.next_action?.iframe_resources?.iframe
        : null;

    if (iframe) {
      this.process3ds
        .loadIframe()!
        .then(() => {
          //TODO: Check if this will be necessary on the frontend side
          // after some the tests in production, since the 3DS process
          // doesn't works properly on the sandbox environment
          // setTimeout(() => {
          //   process3ds.verifyTransactionStatus();
          // }, 10000);
          this.process3ds.verifyTransactionStatus();
        })
        .catch((error) => {
          console.log("Error loading iframe:", error);
        });
    } else {
      const redirectUrl = this.process3ds.getRedirectUrl();
      if (redirectUrl) {
        this.process3ds.redirectToChallenge();
      } else {
        return response;
      }
    }
  }

  async #resumeCheckout(response: any) {
    // Stop the routing process if the transaction is either hard declined or successful
    if (response?.decline?.error_type === "Hard") {
      return response;
    }

    if (["Success", "Authorized"].includes(response?.transaction_status)) {
      return response;
    }

    if (response) {
      const routerItems = {
        checkout_id: response.checkout?.id,
      };

      try {
        return await startCheckoutRouter(
          this.baseUrl,
          this.apiKeyTonder,
          routerItems,
        );
      } catch (error) {
        // throw error
      }
      return response;
    }
  }
}
