import { ThreeDSHandler } from "./3dsHandler";
import { fetchBusiness } from "../data/businessApi";
import { ISupportTarget } from "../types/core";
import { injectMercadoPagoSecurity } from "../helpers/mercadopago";
import { TONDER_URL_BY_MODE } from "../shared/constants/tonderUrl";
import {
  createOrder,
  createPayment,
  startCheckoutRouter,
} from "../data/checkoutApi";
import { getOpenpayDeviceSessionID } from "../data/openPayApi";
import {
  getBrowserInfo,
  isCardPaymentMethod,
  isCoreApm
} from "../helpers/utils";
import { validateSecureToken } from "../helpers/validations";
import { registerOrFetchCustomer } from "../data/customerApi";
import { get } from "../helpers/get";
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
import {CoreVerifyTransaction, ITransaction} from "../types/transaction";
import {GetSecureTokenResponse} from "../types/responses";
import {getSecureToken} from "../data/tokenApi";
import {ErrorKeyEnum} from "../shared/enum/ErrorKeyEnum";
import { IMPConfigRequest } from "../types/mercadoPago";
import { CardOnFile } from "../helpers/card_on_file";
import type { TelemetryClient } from "@tonder.io/client-telemetry";
import { createSdkTelemetry, errorFields, paymentMethodType, type StepFields } from "../helpers/sdkTelemetry";
import { getApiBaseUrl } from "../shared/constants/apiEndpoints";
import { SDK_INFO } from "../helpers/sdkInfo";
import { AppError, buildPublicAppError, buildPublicAppErrorFromAnswer } from "../shared/utils/appError";
import { createCorePayment } from "../data/coreApi";
import { buildCoreProcessBody, newRequestId, rebuildCheckoutResult, rebuildVerifyTransaction } from "../helpers/corePayment";
type CheckoutRequest = {
  card?: Record<string, any>;
  payment_method?: string;
  customer: Record<string, any>;
  isSandbox?: boolean;
  returnUrl?: string;
  enable_card_on_file?: boolean;
};

export class BaseInlineCheckout<T extends CustomizationOptions = CustomizationOptions> {
  baseUrl = "";
  coreBaseUrl = "";
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
  protected telemetry: TelemetryClient;
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
    this.coreBaseUrl = getApiBaseUrl(this.mode);
    this.abortController = new AbortController();
    this.customization = {
      ...this.customization,
      ...(customization || {}),
    }

    this.telemetry = createSdkTelemetry(this.mode, this.apiKeyTonder, sdkInfo || SDK_INFO);

    this.process3ds = new ThreeDSHandler({
      apiKey: this.apiKeyTonder,
      baseUrl: this.baseUrl,
      coreBaseUrl: this.coreBaseUrl,
      buildCoreResult: rebuildVerifyTransaction,
      redirectOnComplete: this.customization.redirectOnComplete,
      tdsIframeId: tdsIframeId,
      tonderPayButtonId: tonderPayButtonId,
      callBack: callBack,
      telemetry: this.telemetry
    });
    this.tdsIframeId = tdsIframeId;
  }

  configureCheckout(data: IConfigureCheckout) {
    this.telemetry.methodCalled("configureCheckout");
    if ("secureToken" in data) this.#setSecureToken(data["secureToken"]);
    this.#setCheckoutData(data)
  }

  /**
   * Times one step of the payment flow and reports how it ended. `run` may fill `fields`
   * (the core's operation id, its HTTP status) for whichever event follows.
   */
  protected async trackStep<T>(
    step: string,
    base: StepFields,
    run: (fields: StepFields) => Promise<T>,
  ): Promise<T> {
    const started = Date.now();
    const fields: StepFields = { ...base };
    try {
      const result = await run(fields);
      this.telemetry.flowStep(step, { outcome: "ok", duration_ms: Date.now() - started, ...fields });
      return result;
    } catch (error) {
      this.telemetry.flowFailed(step, {
        outcome: "error",
        duration_ms: Date.now() - started,
        ...errorFields(error),
        ...fields,
      });
      throw error;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async verify3dsTransaction(): Promise<ITransaction | CoreVerifyTransaction | IStartCheckoutResponse | void> {
    this.telemetry.methodCalled("verify3dsTransaction");
    const engine = this.process3ds.getStoredEngine();
    const result3ds = await this.process3ds.verifyTransactionStatus();
    if (engine === "core") {
      // The core continues its own route after the challenge, so nothing is resumed. The result is the
      // transaction object the monolith's verify answers; it carries no challenge, so a still-open
      // payment never sends the buyer back to the one they just came back from.
      this.process3ds.setPayload(result3ds);
      return result3ds;
    }
    // A challenge found while resuming is stored under the engine of this payment, not the last one used.
    this.process3ds.setEngine("legacy");
    const resultCheckout = await this.#resumeCheckout(result3ds);
    this.process3ds.setPayload(resultCheckout);
    return this._handle3dsRedirect(resultCheckout);
  }

  payment(data: IProcessPaymentRequest): Promise<IStartCheckoutResponse> {
    this.telemetry.methodCalled("payment");
    this.telemetry.flowStep("start", { payment_method_type: paymentMethodType(data.payment_method) });
    return new Promise(async (resolve, reject) => {
      try {
        await this.trackStep("payment", { payment_method_type: paymentMethodType(data.payment_method) }, async () => {
          this.#setCheckoutData(data)
          const response = await this._checkout(data);
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
        });
      } catch (error) {
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
    this.telemetry.methodCalled("getSecureToken");
    try {
      return await getSecureToken(this.baseUrl, secretApikey)
    } catch (error) {
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

  // Customer and saved cards follow the merchant's flag and always share one engine: the
  // customer's token and the secure token are only valid where they were issued.
  protected _supportTarget(): ISupportTarget {
    return this.merchantData?.core_payments_enabled === true
      ? { engine: "core", baseUrl: this.coreBaseUrl }
      : { engine: "legacy", baseUrl: this.baseUrl };
  }

  async _getCustomer(signal: AbortSignal | null = null) {
    if (!!this.#customerData) return this.#customerData!;

    await this._fetchMerchantData();
    this.#customerData = await registerOrFetchCustomer(
      this._supportTarget(),
      this.apiKeyTonder,
      this.customer!,
      signal,
    );
    return this.#customerData!;
  }

  // The customer step belongs to the payment funnel: the cards methods share _getCustomer
  // and must not report it.
  protected async _getCustomerForPayment(signal: AbortSignal | null = null) {
    if (this.#customerData) return this.#customerData;
    return this.trackStep("customer", {}, () => this._getCustomer(signal));
  }

  // The engine is chosen from the flag read when the SDK starts, and travels with the 3DS
  // state: a payment started on one engine is finished by it. An error from the core is
  // the merchant's answer and is never retried on the monolith.
  async _handleCheckout(request: CheckoutRequest) {
    if (this.merchantData?.core_payments_enabled === true && this.#isCorePayment(request)) {
      this.process3ds.setEngine("core");
      const requestId = newRequestId();
      return this.trackStep("charge", { payment_method_type: paymentMethodType(request.payment_method), request_id: requestId }, (fields) =>
        this.#coreCheckout(request, requestId, fields),
      );
    }
    this.process3ds.setEngine("legacy");
    const legacyRequest = await this.#withLegacyCustomer(request);
    return this.trackStep("charge", { payment_method_type: paymentMethodType(request.payment_method) }, () =>
      this.#legacyCheckout(legacyRequest),
    );
  }

  // The legacy order takes the customer's token as `client`, and a core customer's token is
  // not valid on the monolith: a payment that ends on the legacy flow (an alternative method)
  // with the flag ON registers its customer there first.
  async #withLegacyCustomer(request: CheckoutRequest): Promise<CheckoutRequest> {
    if (this._supportTarget().engine !== "core") return request;
    const customer = await registerOrFetchCustomer(
      { engine: "legacy", baseUrl: this.baseUrl },
      this.apiKeyTonder,
      this.customer!,
      this.abortController.signal,
    );
    return { ...request, customer };
  }

  // Card payments (new, saved and Card on File: the core decides the latter by itself) and the
  // APMs the core serves; any other alternative method stays on the legacy flow.
  #isCorePayment({ card, payment_method }: CheckoutRequest) {
    return (!!card && isCardPaymentMethod(payment_method)) || isCoreApm(payment_method);
  }

  async #coreCheckout({
    card,
    payment_method,
    returnUrl: returnUrlData
  }: CheckoutRequest, requestId: string, fields: StepFields) {
    const { reference } = this.merchantData!;
    const payment = buildCoreProcessBody({
      amount: Number(this.cartTotal),
      currency: this.currency,
      reference: this.order_reference ? this.order_reference : reference,
      customer: this.customer,
      card,
      paymentMethodType: isCoreApm(payment_method) ? payment_method : undefined,
      apmConfig: this.#apm_config,
      metadata: this.metadata,
      returnUrl: returnUrlData || this.returnUrl,
      items: this.cartItems,
      browserInfo: getBrowserInfo(),
    });
    const answer = await createCorePayment(this.coreBaseUrl, this.apiKeyTonder, payment, requestId);
    fields.http_status = answer.status;
    if (answer.status >= 400) fields.error_code = answer.body?.error?.code;
    if (typeof answer.body?.id === "string") fields.operation_id = answer.body.id;
    const result = rebuildCheckoutResult(
      answer.status,
      answer.body,
      { coreBaseUrl: this.coreBaseUrl },
      answer.statusText,
    );
    if (result.outcome === "resolve") return result.body;
    throw buildPublicAppErrorFromAnswer({
      errorCode: ErrorKeyEnum.START_CHECKOUT_ERROR,
      status: result.status,
      statusText: result.statusText,
      body: result.body,
    });
  }

  async #legacyCheckout({
    card,
    payment_method,
    customer,
    isSandbox,
    enable_card_on_file,
    // TODO: DEPRECATED
    returnUrl: returnUrlData
  }: CheckoutRequest) {
    const { openpay_keys, reference, business } = this.merchantData!;
    const total = Number(this.cartTotal);
    let orderItems;
    let paymentItems;
    let routerItems
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
          this.coreBaseUrl,
          this.apiKeyTonder,
          this.abortController.signal,
        );
      }
      return this.merchantData;
    } catch (e) {
      // Without its configuration the SDK cannot tell which engine charges, and it never falls
      // back to another source: the caller gets a clear error and the next call asks again.
      throw buildPublicAppError({ errorCode: ErrorKeyEnum.FETCH_BUSINESS_ERROR }, e);
    }
  }

  async _getCustomerCards(
    authToken: string,
    businessId: string | number,
  ): Promise<ICustomerCardsResponse> {
    return await fetchCustomerCards(this._supportTarget(), authToken, this.secureToken, businessId);
  }

  async _saveCustomerCard(
    authToken: string,
    businessId: string | number,
    skyflowTokens: ISaveCardSkyflowRequest,
    appOrigin: boolean = false,
  ): Promise<ISaveCardInternalResponse> {
    return await saveCustomerCard(
      this._supportTarget(),
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
      this._supportTarget(),
      authToken,
      this.secureToken,
      skyflowId,
      businessId,
    );
  }
  async _fetchCustomerPaymentMethods(): Promise<IPaymentMethodResponse> {
    return await fetchCustomerPaymentMethods(this.coreBaseUrl, this.apiKeyTonder);
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
        // The core's customer token must not be stored in the subscription: its owner is the customer's id.
        subscriptionOwner: () =>
          this._supportTarget().engine === "core" && this.#customerData?.id !== undefined
            ? String(this.#customerData.id)
            : undefined,
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
    if (!validateSecureToken(token)) {
      throw buildPublicAppError({
        errorCode: ErrorKeyEnum.SECURE_TOKEN_INVALID,
        statusCode: 400,
      });
    }

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
          return this.process3ds.verifyTransactionStatus();
        })
        .catch(() => {
          // The buyer's return calls verify3dsTransaction(), which surfaces the failure.
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
        // throw error
      }
      return response;
    }
  }
  #handleApmConfig(data: {apm_config?: IMPConfigRequest | Record<string, any>;}) {
    this.#apm_config = data?.apm_config;
  }
}
