import Skyflow from "skyflow-js";
import CollectContainer from "skyflow-js/types/core/external/collect/collect-container";
import CollectElement from "skyflow-js/types/core/external/collect/collect-element";
import { Business } from "../types/commons";
import { CreateOrderRequest, CreatePaymentRequest, RegisterCustomerCardRequest, StartCheckoutRequest, TokensRequest } from "../types/requests";
import { GetBusinessResponse, CustomerRegisterResponse, CreateOrderResponse, CreatePaymentResponse, StartCheckoutResponse, GetVaultTokenResponse, IErrorResponse, GetCustomerCardsResponse, RegisterCustomerCardResponse } from "../types/responses";
import { ErrorResponse } from "./errorResponse";

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
    public_key: string
  ): Promise<string | ErrorResponse> {
    try {
      let openpay = await window.OpenPay;
      openpay.setId(merchant_id);
      openpay.setApiKey(public_key);
      openpay.setSandboxMode(true);
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

      return await this.buildErrorResponse(getBusiness);
    } catch (e) {
      return this.buildErrorResponseFromCatch(e);
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
      return await this.buildErrorResponse(response);
    } catch (e) {
      return this.buildErrorResponseFromCatch(e);
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
      return await this.buildErrorResponse(response);
    } catch (e) {
      return this.buildErrorResponseFromCatch(e);
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
      return await this.buildErrorResponse(response);
    } catch (e) {
      return this.buildErrorResponseFromCatch(e);
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
      return await this.buildErrorResponse(response);
    } catch (e) {
      return this.buildErrorResponseFromCatch(e);
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
      return this.buildErrorResponseFromCatch(Error("Ocurrió un error al montar los campos de la tarjeta"));
    } else {
      try {
        const collectResponseSkyflowTonder = await collectContainer.collect() as any;
        if (collectResponseSkyflowTonder) return collectResponseSkyflowTonder["records"][0]["fields"];
        return this.buildErrorResponseFromCatch(Error("Por favor, verifica todos los campos de tu tarjeta"))
      } catch (error) {
        return this.buildErrorResponseFromCatch(error);
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
      return await this.buildErrorResponse(response);
    } catch (error) {
      return this.buildErrorResponseFromCatch(error);
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
      return await this.buildErrorResponse(response);
    } catch (error) {
      return this.buildErrorResponseFromCatch(error);
    }
  }

  private buildErrorResponseFromCatch(e: any): ErrorResponse {
    return new ErrorResponse({
      code: undefined,
      body: undefined,
      name: typeof e == "string" ? "catch" : (e as Error).name,
      message: typeof e == "string" ? e : (e as Error).message,
      stack: typeof e == "string" ? undefined : (e as Error).stack,
    })
  }

  private async buildErrorResponse(
    response: Response,
    stack: string | undefined = undefined
  ): Promise<ErrorResponse> {
    return new ErrorResponse({
      code: response.status?.toString?.(),
      body: await response?.json?.(),
      name: response.status?.toString?.(),
      message: await response?.text?.(),
      stack,
    } as IErrorResponse);
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
