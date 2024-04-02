import Skyflow from "skyflow-js";
import CollectContainer from "skyflow-js/types/core/external/collect/collect-container";
import CollectElement from "skyflow-js/types/core/external/collect/collect-element";
import { Business } from "../types/commons";
import { CreateOrderRequest, CreatePaymentRequest, RegisterCustomerCardRequest, StartCheckoutRequest, TokensRequest, StartCheckoutFullRequest } from "../types/requests";
import { GetBusinessResponse, CustomerRegisterResponse, CreateOrderResponse, CreatePaymentResponse, StartCheckoutResponse, GetVaultTokenResponse, IErrorResponse, GetCustomerCardsResponse, RegisterCustomerCardResponse } from "../types/responses";
import { ErrorResponse } from "./errorResponse";
import { getBrowserInfo } from "../helpers/utils";

declare global {
  interface Window {
    OpenPay: any;
  }
}

export type LiteCheckoutConstructor = {
  signal: AbortSignal;
  baseUrlTonder: string;
  apiKeyTonder: string;
};

export class LiteCheckout implements LiteCheckoutConstructor {
  signal: AbortSignal;
  baseUrlTonder: string;
  apiKeyTonder: string;

  constructor({
    signal,
    baseUrlTonder,
    apiKeyTonder,
  }: LiteCheckoutConstructor) {
    this.baseUrlTonder = baseUrlTonder;
    this.signal = signal;
    this.apiKeyTonder = apiKeyTonder;
  }

  async getOpenpayDeviceSessionID(
    merchant_id: string,
    public_key: string,
    is_sandbox: boolean
  ): Promise<string | ErrorResponse> {
    try {
      let openpay = await window.OpenPay;
      openpay.setId(merchant_id);
      openpay.setApiKey(public_key);
      openpay.setSandboxMode(is_sandbox);
      return await openpay.deviceData.setup({
        signal: this.signal,
      }) as string;
    } catch (e) {
      throw this.buildErrorResponseFromCatch(e);
    }
  }

  async getBusiness(): Promise<GetBusinessResponse | ErrorResponse> {
    try {
      const getBusiness = await fetch(
        `${this.baseUrlTonder}/api/v1/payments/business/${this.apiKeyTonder}`,
        {
          headers: {
            Authorization: `Token ${this.apiKeyTonder}`,
          },
          signal: this.signal,
        }
      );

      if (getBusiness.ok) return (await getBusiness.json()) as Business;

      throw await this.buildErrorResponse(getBusiness);
    } catch (e) {
      throw this.buildErrorResponseFromCatch(e);
    }
  }

  async customerRegister(email: string): Promise<CustomerRegisterResponse | ErrorResponse> {
    try {
      const url = `${this.baseUrlTonder}/api/v1/customer/`;
      const data = { email: email };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        signal: this.signal,
        body: JSON.stringify(data),
      });

      if (response.ok) return await response.json() as CustomerRegisterResponse;
      throw await this.buildErrorResponse(response);
    } catch (e) {
      throw this.buildErrorResponseFromCatch(e);
    }
  }

  async createOrder(orderItems: CreateOrderRequest): Promise<CreateOrderResponse | ErrorResponse> {
    try {
      const url = `${this.baseUrlTonder}/api/v1/orders/`;
      const data = orderItems;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        body: JSON.stringify(data),
      });
      if (response.ok) return await response.json() as CreateOrderResponse;
      throw await this.buildErrorResponse(response);
    } catch (e) {
      throw this.buildErrorResponseFromCatch(e);
    }
  }

  async createPayment(paymentItems: CreatePaymentRequest): Promise<CreatePaymentResponse | ErrorResponse> {
    try {
      const url = `${this.baseUrlTonder}/api/v1/business/${paymentItems.business_pk}/payments/`;
      const data = paymentItems;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        body: JSON.stringify(data),
      });
      if (response.ok) return await response.json() as CreatePaymentResponse;
      throw await this.buildErrorResponse(response);
    } catch (e) {
      throw this.buildErrorResponseFromCatch(e);
    }
  }

  async startCheckoutRouter(routerData: StartCheckoutRequest): Promise<StartCheckoutResponse | ErrorResponse> {
    try {
      const url = `${this.baseUrlTonder}/api/v1/checkout-router/`;
      const data = routerData;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        body: JSON.stringify(data),
      });
      if (response.ok) return await response.json() as StartCheckoutResponse;
      throw await this.buildErrorResponse(response);
    } catch (e) {
      throw this.buildErrorResponseFromCatch(e);
    }
  }

  async startCheckoutRouterFull(routerFullData: StartCheckoutFullRequest): Promise<StartCheckoutResponse | ErrorResponse> {
    
    try {

      const { 
        order, 
        total, 
        customer, 
        skyflowTokens, 
        return_url, 
        isSandbox, 
        metadata, 
        currency 
      } = routerFullData;

      const merchantResult = await this.getBusiness();

      const customerResult : CustomerRegisterResponse | ErrorResponse = await this.customerRegister(customer.email);

      if(customerResult && "auth_token" in customerResult && merchantResult && "reference" in merchantResult) {

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

        if("id" in orderResult && "id" in customerResult && "business" in merchantResult) {

          const paymentItems: CreatePaymentRequest = {
            business_pk: merchantResult.business.pk,
            amount: total,
            date: dateString,
            order_id: orderResult.id,
            client_id: customerResult.id
          };

          const paymentResult = await this.createPayment(
            paymentItems
          );

          let deviceSessionIdTonder: any;

          const { openpay_keys, business } = merchantResult

          if (openpay_keys.merchant_id && openpay_keys.public_key) {
            deviceSessionIdTonder = await this.getOpenpayDeviceSessionID(
              openpay_keys.merchant_id,
              openpay_keys.public_key,
              isSandbox
            );
          }

          const routerItems: StartCheckoutRequest = {
            card: skyflowTokens,
            name: skyflowTokens.cardholder_name,
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
            device_session_id: deviceSessionIdTonder ? deviceSessionIdTonder : null,
            token_id: "",
            order_id: ("id" in orderResult) && orderResult.id,
            business_id: business.pk,
            payment_id: ("pk" in paymentResult) && paymentResult.pk,
            source: 'sdk',
            metadata: metadata,
            browser_info: getBrowserInfo(),
            currency: currency
          };

          const checkoutResult = await this.startCheckoutRouter(routerItems);

          return checkoutResult;
          
        } else {

          throw new ErrorResponse({
            code: "500",
            body: orderResult as any,
            name: "Keys error",
            message: "Order response errors"
          } as IErrorResponse)
        
        }
      
      } else {

        throw new ErrorResponse({
          code: "500",
          body: merchantResult as any,
          name: "Keys error",
          message: "Merchant or customer reposne errors"
        } as IErrorResponse)
      
      }
    } catch (e) {
      
      throw this.buildErrorResponseFromCatch(e);
    
    }
  }

  async getSkyflowTokens({
    vault_id,
    vault_url,
    data,
  }: TokensRequest): Promise<any | ErrorResponse> {
    const skyflow = Skyflow.init({
      vaultID: vault_id,
      vaultURL: vault_url,
      getBearerToken: async () => await this.getVaultToken(),
      options: {
        logLevel: Skyflow.LogLevel.ERROR,
        env: Skyflow.Env.DEV,
      },
    });

    const collectContainer: CollectContainer = skyflow.container(
      Skyflow.ContainerType.COLLECT
    ) as CollectContainer;

    const fieldPromises = await this.getFieldsPromise(data, collectContainer);

    const result = await Promise.all(fieldPromises);

    const mountFail = result.some((item: boolean) => !item);

    if (mountFail) {
      throw this.buildErrorResponseFromCatch(Error("Ocurrió un error al montar los campos de la tarjeta"));
    } else {
      try {
        const collectResponseSkyflowTonder = await collectContainer.collect() as any;
        if (collectResponseSkyflowTonder) return collectResponseSkyflowTonder["records"][0]["fields"];
        throw this.buildErrorResponseFromCatch(Error("Por favor, verifica todos los campos de tu tarjeta"))
      } catch (error) {
        throw this.buildErrorResponseFromCatch(error);
      }
    }
  }

  async getVaultToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrlTonder}/api/v1/vault-token/`, {
        method: "GET",
        headers: {
          Authorization: `Token ${this.apiKeyTonder}`,
        },
        signal: this.signal,
      });
      if (response.ok) return (await response.json() as GetVaultTokenResponse)?.token;
      throw new Error(`HTTPCODE: ${response.status}`)
    } catch (e) {
      throw new Error(`Failed to retrieve bearer token; ${typeof e == "string" ? e : (e as Error).message}`)
    }
  }

  async getFieldsPromise(data: any, collectContainer: CollectContainer): Promise<Promise<boolean>[]> {
    const fields = await this.getFields(data, collectContainer);
    if (!fields) return [];

    return fields.map((field: { element: CollectElement, key: string }) => {
      return new Promise((resolve) => {
        const div = document.createElement("div");
        div.hidden = true;
        div.id = `id-${field.key}`;
        document.querySelector(`body`)?.appendChild(div);
        setTimeout(() => {
          field.element.mount(`#id-${field.key}`);
          setInterval(() => {
            if (field.element.isMounted()) {
              const value = data[field.key];
              field.element.update({ value: value });
              return resolve(field.element.isMounted());
            }
          }, 120);
        }, 120);
      });
    })
  }

  async registerCustomerCard(customerToken: string, data: RegisterCustomerCardRequest): Promise<RegisterCustomerCardResponse | ErrorResponse> {
    try {
      const response = await fetch(`${this.baseUrlTonder}/api/v1/cards/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${customerToken}`,
          'Content-Type': 'application/json'
        },
        signal: this.signal,
        body: JSON.stringify(data)
      });

      if (response.ok) return await response.json() as RegisterCustomerCardResponse;
      throw await this.buildErrorResponse(response);
    } catch (error) {
      throw this.buildErrorResponseFromCatch(error);
    }
  }

  async getCustomerCards(customerToken: string, query: string = ""): Promise<GetCustomerCardsResponse | ErrorResponse> {
    try {
      const response = await fetch(`${this.baseUrlTonder}/api/v1/cards/${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${customerToken}`,
          'Content-Type': 'application/json'
        },
        signal: this.signal,
      });

      if (response.ok) return await response.json() as GetCustomerCardsResponse;
      throw await this.buildErrorResponse(response);
    } catch (error) {
      throw this.buildErrorResponseFromCatch(error);
    }
  }

  async deleteCustomerCard(customerToken: string, skyflowId: string = ""): Promise<Boolean | ErrorResponse> {
    try {
      const response = await fetch(`${this.baseUrlTonder}/api/v1/cards/${skyflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${customerToken}`,
          'Content-Type': 'application/json'
        },
        signal: this.signal,
      });

      if (response.ok) return true;
      throw await this.buildErrorResponse(response);
    } catch (error) {
      throw this.buildErrorResponseFromCatch(error);
    }
  }

  private buildErrorResponseFromCatch(e: any): ErrorResponse {
    
    const error = new ErrorResponse({
      code: e?.status ? e.status : e.code,
      body: e?.body,
      name: e ? typeof e == "string" ? "catch" : (e as Error).name : "Error",
      message: e ? (typeof e == "string" ? e : (e as Error).message) : "Error",
      stack: typeof e == "string" ? undefined : (e as Error).stack,
    })

    return error;
  }

  private async buildErrorResponse(
    response: Response,
    stack: string | undefined = undefined
  ): Promise<ErrorResponse> {

    let body, status, message = "Error";

    if(response && "json" in response) {
      body = await response?.json();
    }

    if(response && "status" in response) {
      status = response.status.toString();
    }

    if(response && "text" in response) {
      message = await response.text();
    }

    const error = new ErrorResponse({
      code: status,
      body: body,
      name: status,
      message: message,
      stack,
    } as IErrorResponse)
    
    return error;
  }

  private async getFields(data: any, collectContainer: CollectContainer): Promise<{ element: CollectElement, key: string }[]> {
    return await Promise.all(
      Object.keys(data).map(async (key) => {
        const cardHolderNameElement = await collectContainer.create({
          table: "cards",
          column: key,
          type: Skyflow.ElementType.INPUT_FIELD,
        });
        return { element: cardHolderNameElement, key: key };
      })
    )
  }
}
