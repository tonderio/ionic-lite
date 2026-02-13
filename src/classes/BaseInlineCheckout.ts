import { ThreeDSHandler } from "./3dsHandler";
import { fetchBusiness } from "../data/businessApi";
import { injectMercadoPagoSecurity } from "../helpers/mercadopago";
import { TONDER_URL_BY_MODE } from "../shared/constants/tonderUrl";
import {
  createOrder,
  createPayment,
  startCheckoutRouter,
} from "../data/checkoutApi";
import { getOpenpayDeviceSessionID } from "../data/openPayApi";
import {
  getBrowserInfo
} from "../helpers/utils";
import { registerOrFetchCustomer } from "../data/customerApi";
import { get } from "lodash";
import {
  fetchCustomerCards,
  removeCustomerCard,
  saveCustomerCard,
} from "../data/cardApi";
import { fetchCustomerPaymentMethods } from "../data/paymentMethodApi";
import {
  Business,
  IConfigureCheckout,
  IInlineCheckoutBaseOptions,
  CustomizationOptions,
} from "../types/commons";
import {ICustomer} from "../types/customer";
import {ICardFields, IItem, IProcessPaymentRequest, IStartCheckoutResponse} from "../types/checkout";
import {ICustomerCardsResponse, ISaveCardInternalResponse, ISaveCardSkyflowRequest} from "../types/card";
import {IPaymentMethodResponse} from "../types/paymentMethod";
import {ITransaction} from "../types/transaction";
import {GetSecureTokenResponse} from "../types/responses";
import {getSecureToken} from "../data/tokenApi";
import {ErrorKeyEnum} from "../shared/enum/ErrorKeyEnum";
import { IMPConfigRequest } from "../types/mercadoPago";
import { CardOnFile } from "../helpers/card_on_file";
import { SdkTelemetryClient } from "../helpers/SdkTelemetryClient";
import { getTelemetryEndpoint } from "../shared/constants/apiEndpoints";
import { SDK_INFO } from "../helpers/sdkInfo";
import { AppError, buildPublicAppError } from "../shared/utils/appError";
export class BaseInlineCheckout<T extends CustomizationOptions = CustomizationOptions> {
  baseUrl = "";
  cartTotal: string | number = "0";
  process3ds: ThreeDSHandler;
  mode?: "production" | "sandbox" | "stage" | "development" | undefined;
  apiKeyTonder: string;
  returnUrl?: string;
  tdsIframeId?: string;
  tonderPayButtonId?: string;
  callBack?: ((response: IStartCheckoutResponse | Record<string, any>) => void) | undefined;
  merchantData?: Business;
  abortController: AbortController;
  secureToken: string = "";
  customer?: ICustomer | { email: string };
  customization: T  = {
    redirectOnComplete: true
  } as T;

  cartItems?: IItem[];
  metadata = {};
  order_reference?: string | null = null;
  card? = {};
  currency?: string = "";
  protected cardOnFileInstance: CardOnFile | null = null;
  protected telemetry: SdkTelemetryClient;
  protected readonly requestId: string;
  #apm_config?:IMPConfigRequest | Record<string, any>
  #customerData?: Record<string, any>;

  constructor({
    mode = "stage",
    customization,
    apiKey,
    apiKeyTonder,
    returnUrl,
    tdsIframeId,
    callBack = () => {},
    baseUrlTonder,
    tonderPayButtonId,
    sdkInfo,
  }: IInlineCheckoutBaseOptions) {
    this.apiKeyTonder = apiKeyTonder || apiKey || "";
    this.returnUrl = returnUrl;
    this.callBack = callBack;
    this.mode = mode;
    this.customer = {} as ICustomer
    this.baseUrl = baseUrlTonder || TONDER_URL_BY_MODE[this.mode] || TONDER_URL_BY_MODE["stage"];
    this.abortController = new AbortController();
    this.requestId = this.generateRequestId();
    this.customization = {
      ...this.customization,
      ...(customization || {}),
    }

    this.process3ds = new ThreeDSHandler({
      apiKey: apiKey,
      baseUrl: this.baseUrl,
      redirectOnComplete: this.customization.redirectOnComplete,
      tdsIframeId: tdsIframeId,
      tonderPayButtonId: tonderPayButtonId,
      callBack: callBack
    });
    this.tdsIframeId = tdsIframeId;

    const resolvedSdkInfo = sdkInfo || SDK_INFO;

    // Initialize telemetry
    this.telemetry = new SdkTelemetryClient({
      endpoint: getTelemetryEndpoint(this.mode),
      apiKey: this.apiKeyTonder,
      platform: resolvedSdkInfo.name,
      platform_version: resolvedSdkInfo.version,
      mode: this.mode || "stage",
    });
  }

  configureCheckout(data: IConfigureCheckout) {
    if ("secureToken" in data) this.#setSecureToken(data["secureToken"]);
    this.#setCheckoutData(data)
  }

  /**
   * Get customer ID for telemetry (if available)
   */
  protected getCustomerId(): string | undefined {
    return this.#customerData?.id?.toString();
  }

  /**
   * Report SDK errors to telemetry endpoint
   * NEVER throws - completely silent on failure
   */
  protected reportSdkError(err: unknown, extra?: Record<string, any>): void {
    try {
      const defaultUserId = this.getCustomerId();
      const telemetryError =
        err instanceof AppError && err.originalError !== undefined
          ? err.originalError
          : err;
      const metadata = {
        ...(extra?.metadata || {}),
        ...(extra?.metadata?.error === undefined ? { error: telemetryError } : {}),
      };
      const context: Record<string, any> = {
        tenant_id: this.merchantData?.business?.pk?.toString(),
        user_id: defaultUserId,
        ...(extra || {}),
        metadata,
        request_id: this.requestId,
      };

      if (!context.user_id) delete context.user_id;
      context.feature = extra?.feature || "unknown";

      this.telemetry.captureException(err, context);
    } catch (e) {
      // Silent - never throw
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async verify3dsTransaction(): Promise<ITransaction | IStartCheckoutResponse | void> {
    const result3ds = await this.process3ds.verifyTransactionStatus();
    const resultCheckout = await this.#resumeCheckout(result3ds);
    this.process3ds.setPayload(resultCheckout);
    return this._handle3dsRedirect(resultCheckout);
  }

  payment(data: IProcessPaymentRequest): Promise<IStartCheckoutResponse> {
    return new Promise(async (resolve, reject) => {
      let response;
      try {
        this.#setCheckoutData(data)
        response = await this._checkout(data);
        this.process3ds.setPayload(response);
        const payload = await this._handle3dsRedirect(response);
        if (payload) {
          try {
            const selector: any = document.querySelector(`#${this.tonderPayButtonId}`);
            if(selector) {
              selector.disabled = false;
            }
          } catch {}
          if (this.callBack) this.callBack!(response);
          resolve(response);
        }
      } catch (error) {
        this.reportSdkError(error, {
          feature: "payment",
          process_id: response?.payment_id  || response?.payment?.id || response?.payment?.pk,
          metadata: {
            step: "payment",
            request: data,
            response
          },
        });
        reject(
          buildPublicAppError(
            {
              errorCode: ErrorKeyEnum.PAYMENT_PROCESS_ERROR,
            },
            error,
          ),
        );
      }
    });
  }

  async getSecureToken(secretApikey: string): Promise<GetSecureTokenResponse> {
    try {
      return await getSecureToken(this.baseUrl, secretApikey)
    } catch (error) {
      this.reportSdkError(error, {
        feature: "secure-token",
        metadata: {
          step: "getSecureToken",
        },
      });
      throw buildPublicAppError(
        {
          errorCode: ErrorKeyEnum.SECURE_TOKEN_ERROR,
        },
        error,
      );
    }
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

    if (this._hasCardOnFileKeys()) {
      await this._initializeCardOnFile();
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
    enable_card_on_file,
    // TODO: DEPRECATED
    returnUrl: returnUrlData
  }: {
    card?: Record<string, any>;
    payment_method?: string;
    customer: Record<string, any>;
    isSandbox?: boolean;
    returnUrl?: string;
    enable_card_on_file?: boolean;
  }) {
    const { openpay_keys, reference, business } = this.merchantData!;
    const total = Number(this.cartTotal);
    let orderItems;
    let paymentItems;
    let routerItems
    try {
      let deviceSessionIdTonder;
      if (
        !deviceSessionIdTonder &&
        openpay_keys.merchant_id &&
        openpay_keys.public_key &&
        !payment_method
      ) {
        deviceSessionIdTonder = await getOpenpayDeviceSessionID(
          openpay_keys.merchant_id,
          openpay_keys.public_key,
          isSandbox,
          this.abortController.signal,
        );
      }

      const { id, auth_token } = customer;

      orderItems = {
        business: this.apiKeyTonder,
        client: auth_token,
        billing_address_id: null,
        shipping_address_id: null,
        amount: total,
        status: "A",
        reference: reference,
        is_oneclick: true,
        items: this.cartItems!,
        currency: this.currency,
        metadata: this.metadata,
      };
      const jsonResponseOrder = await createOrder(
        this.baseUrl,
        this.apiKeyTonder,
        orderItems,
      );

      // Create payment
      const now = new Date();
      const dateString = now.toISOString();

      paymentItems = {
        business_pk: business.pk,
        client_id: id,
        amount: total,
        date: dateString,
        order_id: jsonResponseOrder.id,
        customer_order_reference: this.order_reference ? this.order_reference : reference,
        items: this.cartItems,
        currency: this.currency,
        metadata: this.metadata,
      };
      const jsonResponsePayment = await createPayment(
        this.baseUrl,
        this.apiKeyTonder,
        paymentItems,
      );

      // Checkout router
      routerItems = {
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
        items: this.cartItems,
        metadata: this.metadata,
        browser_info: getBrowserInfo(),
        currency: this.currency!,
        ...(!!payment_method ? { payment_method } : { card }),
        apm_config: this.#apm_config,
        ...(this.customer && "identification" in this.customer ? { identification: this.customer.identification } : {}),
        ...(enable_card_on_file !== undefined ? { enable_card_on_file } : {}),
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
      this.reportSdkError(error, {
        feature: "payment",
        process_id: routerItems?.payment_id,
        metadata: {
          step: "_handleCheckout",
          orderItems,
          paymentItems,
          routerItems
        },
      });
      throw error;
    }
  }

  #setCheckoutData(data: IConfigureCheckout | IProcessPaymentRequest){
    if(!data || (data && Object.keys(data).length === 0)) return;
    this.#handleCustomer(data.customer);
    this._setCartTotal(data.cart?.total || 0);
    this.#setCartItems(data.cart?.items || []);
    this.#handleMetadata(data);
    this.#handleCurrency(data);
    this.#handleCard(data);
    this.#handleApmConfig(data);
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
      this.reportSdkError(e, {
        feature: "fetch-merchant-data",
        metadata: {
          step: "_fetchMerchantData",
        },
      });
      return this.merchantData;
    }
  }

  async _getCustomerCards(
    authToken: string,
    businessId: string | number,
  ): Promise<ICustomerCardsResponse> {
    return await fetchCustomerCards(this.baseUrl, authToken, this.secureToken, businessId);
  }

  async _saveCustomerCard(
    authToken: string,
    businessId: string | number,
    skyflowTokens: ISaveCardSkyflowRequest,
    appOrigin: boolean = false,
  ): Promise<ISaveCardInternalResponse> {
    return await saveCustomerCard(
      this.baseUrl,
      authToken,
      this.secureToken,
      businessId,
      skyflowTokens,
      appOrigin
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
      this.secureToken,
      skyflowId,
      businessId,
    );
  }
  async _fetchCustomerPaymentMethods(): Promise<IPaymentMethodResponse> {
    return await fetchCustomerPaymentMethods(this.baseUrl, this.apiKeyTonder);
  }

  protected _hasCardOnFileKeys(): boolean {
    return !!this.merchantData?.cardonfile_keys?.public_key;
  }

  protected async _initializeCardOnFile(): Promise<CardOnFile> {
    if (!this.cardOnFileInstance) {
      this.cardOnFileInstance = new CardOnFile({
        merchantId: this.merchantData?.cardonfile_keys!.public_key!,
        apiKey: this.apiKeyTonder,
        isTestEnvironment: this.mode !== "production",
      });
      await this.cardOnFileInstance.initialize();
    }

    return this.cardOnFileInstance;
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

  #handleMetadata(data: { metadata?: any; order_reference?: string | null }) {
    this.metadata = data?.metadata;
    this.order_reference = data?.order_reference;
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
          this.reportSdkError(error, {
            feature: "3ds-verification",
            metadata: {
              step: "_handle3dsRedirect",
              response,
            },
          });
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
    if (response?.decline?.error_type === "Hard" || 
       !!response?.checkout?.is_route_finished ||
      !!response?.is_route_finished ||
      ["Pending"].includes(response?.transaction_status)) {
      return response;
    }

    if (["Success", "Authorized"].includes(response?.transaction_status)) {
      return response;
    }

    if (response) {
      const routerItems = {
        checkout_id: response.checkout?.id || response?.checkout_id,
      };

      try {
        return await startCheckoutRouter(
          this.baseUrl,
          this.apiKeyTonder,
          routerItems,
        );
      } catch (error) {
        this.reportSdkError(error, {
          feature: "payment",
          process_id: response?.payment_id  || response?.payment?.id || response?.payment?.pk,
          metadata: {
            step: "#resumeCheckout",
            response
          },
        });
        // throw error
      }
      return response;
    }
  }
  #handleApmConfig(data: {apm_config?: IMPConfigRequest | Record<string, any>;}) {
    this.#apm_config = data?.apm_config;
  }
}
