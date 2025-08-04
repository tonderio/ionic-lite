import { fetchBusiness } from "../data/businessApi";

declare const MP_DEVICE_SESSION_ID: string | undefined;
import { ErrorResponse } from "./errorResponse";
import {
  buildErrorResponse,
  buildErrorResponseFromCatch,
  getBrowserInfo,
  getBusinessId,
  formatPublicErrorResponse,
  getCardType,
} from "../helpers/utils";
import { getCustomerAPMs } from "../data/api";
import { BaseInlineCheckout } from "./BaseInlineCheckout";
import { MESSAGES } from "../shared/constants/messages";
import { getSkyflowTokens } from "../helpers/skyflow";
import { startCheckoutRouter } from "../data/checkoutApi";
import { getOpenpayDeviceSessionID } from "../data/openPayApi";
import { getPaymentMethodDetails } from "../shared/catalog/paymentMethodsCatalog";
import {APM, IInlineLiteCheckoutOptions, TonderAPM} from "../types/commons";
import {ICustomerCardsResponse, ISaveCardRequest, ISaveCardResponse, ISaveCardSkyflowRequest} from "../types/card";
import {IPaymentMethod} from "../types/paymentMethod";
import {
  CreateOrderResponse,
  CreatePaymentResponse,
  CustomerRegisterResponse,
  GetBusinessResponse, IErrorResponse, RegisterCustomerCardResponse, StartCheckoutResponse
} from "../types/responses";
import {
  CreateOrderRequest,
  CreatePaymentRequest, RegisterCustomerCardRequest, StartCheckoutFullRequest,
  StartCheckoutIdRequest,
  StartCheckoutRequest,
  TokensRequest
} from "../types/requests";
import {ICardFields, IStartCheckoutResponse} from "../types/checkout";
import {ILiteCheckout} from "../types/liteInlineCheckout";

declare global {
  interface Window {
    OpenPay: any;
  }
}

export class LiteCheckout extends BaseInlineCheckout implements ILiteCheckout{
  activeAPMs: APM[] = [];

  constructor({ apiKey, mode, returnUrl, callBack, apiKeyTonder, baseUrlTonder, customization, collectorIds }: IInlineLiteCheckoutOptions) {
    super({ mode, apiKey, returnUrl, callBack, apiKeyTonder, baseUrlTonder, customization, tdsIframeId: collectorIds && 'tdsIframe' in collectorIds ? collectorIds?.tdsIframe : "tdsIframe"});
  }

  public async injectCheckout() {
    await this._initializeCheckout();
  }

  public async getCustomerCards(): Promise<ICustomerCardsResponse> {
    try {
      await this._fetchMerchantData();
      const { auth_token } = await this._getCustomer();
      const response = await this._getCustomerCards(
        auth_token,
        this.merchantData!.business.pk,
      );

      return {
        ...response,
        cards: response.cards.map((ic) => ({
          ...ic,
          icon: getCardType(ic.fields.card_scheme),
        })),
      };
    } catch (error) {
      throw formatPublicErrorResponse(
        {
          message: MESSAGES.getCardsError,
        },
        error,
      );
    }
  }

  public async saveCustomerCard(
    card: ISaveCardRequest,
  ): Promise<ISaveCardResponse> {
    try {
      await this._fetchMerchantData();
      const { auth_token } = await this._getCustomer();
      const { vault_id, vault_url, business } = this.merchantData!;

      const skyflowTokens: ISaveCardSkyflowRequest = await getSkyflowTokens({
        vault_id: vault_id,
        vault_url: vault_url,
        data: {...card, 
          card_number: card.card_number.replace(/\s+/g, ""),
          expiration_month: card.expiration_month.replace(/\s+/g, ""),
          expiration_year: card.expiration_year.replace(/\s+/g, ""),
          cvv: card.cvv.replace(/\s+/g, ""),
          cardholder_name: card.cardholder_name.replace(/\s+/g, ""),
        },
        baseUrl: this.baseUrl,
        apiKey: this.apiKeyTonder,
      });

      return await this._saveCustomerCard(
        auth_token,
        business?.pk,
        skyflowTokens,
      );
    } catch (error) {
      throw formatPublicErrorResponse(
        {
          message: MESSAGES.saveCardError,
        },
        error,
      );
    }
  }

  public async removeCustomerCard(skyflowId: string): Promise<string> {
    try {
      await this._fetchMerchantData();
      const { auth_token } = await this._getCustomer();
      const { business } = this.merchantData!;

      return await this._removeCustomerCard(
        auth_token,
        business?.pk,
        skyflowId,
      );
    } catch (error) {
      throw formatPublicErrorResponse(
        {
          message: MESSAGES.removeCardError,
        },
        error,
      );
    }
  }

  public async getCustomerPaymentMethods(): Promise<IPaymentMethod[]> {
    try {
      const response = await this._fetchCustomerPaymentMethods();

      const apms_results =
        response && "results" in response && response["results"].length > 0
          ? response["results"]
          : [];

      return apms_results
        .filter((apmItem) => apmItem.category.toLowerCase() !== "cards")
        .map((apmItem) => {
          const apm = {
            id: apmItem.pk,
            payment_method: apmItem.payment_method,
            priority: apmItem.priority,
            category: apmItem.category,
            ...getPaymentMethodDetails(apmItem.payment_method),
          };
          return apm;
        })
        .sort((a, b) => a.priority - b.priority);
    } catch (error) {
      throw formatPublicErrorResponse(
        {
          message: MESSAGES.getPaymentMethodsError,
        },
        error,
      );
    }
  }

  public async getBusiness(): Promise<GetBusinessResponse> {
    try {
      return await fetchBusiness(
        this.baseUrl,
        this.apiKeyTonder,
        this.abortController.signal,
      );
    } catch (e) {
      throw formatPublicErrorResponse(
        {
          message: MESSAGES.getBusinessError,
        },
        e,
      );
    }
  }

  // TODO: DEPRECATED
  async getOpenpayDeviceSessionID(
    merchant_id: string,
    public_key: string,
    is_sandbox: boolean,
  ): Promise<string | ErrorResponse> {
    try {
      return await getOpenpayDeviceSessionID(
        merchant_id,
        public_key,
        is_sandbox,
      );
    } catch (e) {
      throw buildErrorResponseFromCatch(e);
    }
  }

  // TODO: DEPRECATED
  async getSkyflowTokens({
    vault_id,
    vault_url,
    data,
  }: TokensRequest): Promise<any | ErrorResponse> {
    return await getSkyflowTokens({
      vault_id: vault_id,
      vault_url: vault_url,
      data,
      baseUrl: this.baseUrl,
      apiKey: this.apiKeyTonder,
    });
  }

  _setCartTotal(total: string) {
    this.cartTotal = total;
  }

  async _checkout({
    card,
    payment_method,
    isSandbox,
    // TODO: DEPRECATED
    returnUrl: returnUrlData
  }: {
    card?: ICardFields | string;
    payment_method?: string;
    isSandbox?: boolean;
    returnUrl?: string;
  }) {
    await this._fetchMerchantData();
    const customer = await this._getCustomer(this.abortController.signal);
    const { vault_id, vault_url } = this.merchantData!;
    let skyflowTokens;
    if (!payment_method || payment_method === "" || payment_method === null) {
      if (typeof card === "string") {
        skyflowTokens = {
          skyflow_id: card,
        };
      } else {
        skyflowTokens = await getSkyflowTokens({
          vault_id: vault_id,
          vault_url: vault_url,
          data: { ...card, card_number: card!.card_number.replace(/\s+/g, "") },
          baseUrl: this.baseUrl,
          apiKey: this.apiKeyTonder,
        });
      }
    }

    return await this._handleCheckout({
      card: skyflowTokens,
      payment_method,
      customer,
      isSandbox,
      returnUrl: returnUrlData
    });
  }

  // TODO: DEPRECATED
  async customerRegister(
    email: string,
  ): Promise<CustomerRegisterResponse | ErrorResponse> {
    try {
      const url = `${this.baseUrl}/api/v1/customer/`;
      const data = { email: email };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        signal: this.abortController.signal,
        body: JSON.stringify(data),
      });

      if (response.ok)
        return (await response.json()) as CustomerRegisterResponse;
      throw await buildErrorResponse(response);
    } catch (e) {
      throw buildErrorResponseFromCatch(e);
    }
  }

  // TODO: DEPRECATED
  async createOrder(
    orderItems: CreateOrderRequest,
  ): Promise<CreateOrderResponse | ErrorResponse> {
    try {
      const url = `${this.baseUrl}/api/v1/orders/`;
      const data = orderItems;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        body: JSON.stringify(data),
      });
      if (response.ok) return (await response.json()) as CreateOrderResponse;
      throw await buildErrorResponse(response);
    } catch (e) {
      throw buildErrorResponseFromCatch(e);
    }
  }

  // TODO: DEPRECATED
  async createPayment(
    paymentItems: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse | ErrorResponse> {
    try {
      const url = `${this.baseUrl}/api/v1/business/${paymentItems.business_pk}/payments/`;
      const data = paymentItems;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        body: JSON.stringify(data),
      });
      if (response.ok) return (await response.json()) as CreatePaymentResponse;
      throw await buildErrorResponse(response);
    } catch (e) {
      throw buildErrorResponseFromCatch(e);
    }
  }

  // TODO: DEPRECATED
  async startCheckoutRouter(
    routerData: StartCheckoutRequest | StartCheckoutIdRequest,
  ): Promise<StartCheckoutResponse | ErrorResponse | undefined> {
    const checkoutResult = await startCheckoutRouter(
      this.baseUrl,
      this.apiKeyTonder,
      routerData,
    );
    const payload = await this.init3DSRedirect(checkoutResult);
    if (payload) return checkoutResult;
  }

  // TODO: DEPRECATED
  async init3DSRedirect(checkoutResult: IStartCheckoutResponse) {
    this.process3ds.setPayload(checkoutResult);
    return await this._handle3dsRedirect(checkoutResult);
  }

  // TODO: DEPRECATED
  async startCheckoutRouterFull(
    routerFullData: StartCheckoutFullRequest,
  ): Promise<StartCheckoutResponse | ErrorResponse | undefined> {
    try {
      const {
        order,
        total,
        customer,
        skyflowTokens,
        return_url,
        isSandbox,
        metadata,
        currency,
        payment_method,
      } = routerFullData;

      const merchantResult = await this._fetchMerchantData();

      const customerResult: CustomerRegisterResponse | ErrorResponse =
        await this.customerRegister(customer.email);

      if (
        customerResult &&
        "auth_token" in customerResult &&
        merchantResult &&
        "reference" in merchantResult
      ) {
        const orderData: CreateOrderRequest = {
          business: this.apiKeyTonder,
          client: customerResult.auth_token,
          billing_address_id: null,
          shipping_address_id: null,
          amount: total,
          reference: merchantResult.reference,
          is_oneclick: true,
          items: order.items,
        };

        const orderResult = await this.createOrder(orderData);

        const now = new Date();

        const dateString = now.toISOString();

        if (
          "id" in orderResult &&
          "id" in customerResult &&
          "business" in merchantResult
        ) {
          const paymentItems: CreatePaymentRequest = {
            business_pk: merchantResult.business.pk,
            amount: total,
            date: dateString,
            order_id: orderResult.id,
            client_id: customerResult.id,
          };

          const paymentResult = await this.createPayment(paymentItems);

          let deviceSessionIdTonder: any;

          const { openpay_keys, business } = merchantResult;

          if (openpay_keys.merchant_id && openpay_keys.public_key) {
            deviceSessionIdTonder = await getOpenpayDeviceSessionID(
              openpay_keys.merchant_id,
              openpay_keys.public_key,
              isSandbox,
            );
          }

          const routerItems: StartCheckoutRequest = {
            name: customer.name,
            last_name: customer.lastname,
            email_client: customer.email,
            phone_number: customer.phone,
            return_url: return_url,
            id_product: "no_id",
            quantity_product: 1,
            id_ship: "0",
            instance_id_ship: "0",
            amount: total,
            title_ship: "shipping",
            description: "transaction",
            device_session_id: deviceSessionIdTonder
              ? deviceSessionIdTonder
              : null,
            token_id: "",
            order_id: "id" in orderResult && orderResult.id,
            business_id: business.pk,
            payment_id: "pk" in paymentResult && paymentResult.pk,
            source: "sdk",
            metadata: metadata,
            browser_info: getBrowserInfo(),
            currency: currency,
            ...(!!payment_method
              ? { payment_method }
              : { card: skyflowTokens }),
            ...(typeof MP_DEVICE_SESSION_ID !== "undefined"
              ? { mp_device_session_id: MP_DEVICE_SESSION_ID }
              : {}),
          };

          const checkoutResult = await startCheckoutRouter(
            this.baseUrl,
            this.apiKeyTonder,
            routerItems,
          );
          const payload = await this.init3DSRedirect(checkoutResult);
          if (payload) return checkoutResult;
        } else {
          throw new ErrorResponse({
            code: "500",
            body: orderResult as any,
            name: "Keys error",
            message: "Order response errors",
          } as IErrorResponse);
        }
      } else {
        throw new ErrorResponse({
          code: "500",
          body: merchantResult as any,
          name: "Keys error",
          message: "Merchant or customer reposne errors",
        } as IErrorResponse);
      }
    } catch (e) {
      throw buildErrorResponseFromCatch(e);
    }
  }

  // TODO: DEPRECATED
  async registerCustomerCard(
    secureToken: string,
    customerToken: string,
    data: RegisterCustomerCardRequest,
  ): Promise<RegisterCustomerCardResponse | ErrorResponse> {
    try {
      await this._fetchMerchantData();

      const response = await fetch(
        `${this.baseUrl}/api/v1/business/${getBusinessId(this.merchantData)}/cards/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secureToken}`,
            "User-token": customerToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...data }),
        },
      );

      if (response.ok)
        return (await response.json()) as RegisterCustomerCardResponse;
      throw await buildErrorResponse(response);
    } catch (error) {
      throw buildErrorResponseFromCatch(error);
    }
  }

  // TODO: DEPRECATED
  async deleteCustomerCard(
    customerToken: string,
    skyflowId: string = "",
  ): Promise<Boolean | ErrorResponse> {
    try {
      await this._fetchMerchantData();
      const response = await fetch(
        `${this.baseUrl}/api/v1/business/${getBusinessId(this.merchantData)}/cards/${skyflowId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${customerToken}`,
            "Content-Type": "application/json",
          },
          signal: this.abortController.signal,
        },
      );

      if (response.ok) return true;
      throw await buildErrorResponse(response);
    } catch (error) {
      throw buildErrorResponseFromCatch(error);
    }
  }

  // TODO: DEPRECATED
  async getActiveAPMs(): Promise<APM[]> {
    try {
      const apms_response = await getCustomerAPMs(
        this.baseUrl,
        this.apiKeyTonder,
      );
      const apms_results =
        apms_response &&
        apms_response["results"] &&
        apms_response["results"].length > 0
          ? apms_response["results"]
          : [];
      this.activeAPMs = apms_results
        .filter(
          (apmItem: TonderAPM) => apmItem.category.toLowerCase() !== "cards",
        )
        .map((apmItem: TonderAPM) => {
          const apm: APM = {
            id: apmItem.pk,
            payment_method: apmItem.payment_method,
            priority: apmItem.priority,
            category: apmItem.category,
            ...getPaymentMethodDetails(apmItem.payment_method),
          };
          return apm;
        })
        .sort((a: APM, b: APM) => a.priority - b.priority);

      return this.activeAPMs;
    } catch (e) {
      console.error("Error getting APMS", e);
      return [];
    }
  }
}
