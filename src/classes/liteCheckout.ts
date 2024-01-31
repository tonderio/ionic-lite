import { Business, CreateOrderResponse, CreatePaymentRequest, CreatePaymentResponse, CustomerRegisterResponse, GetVaultTokenResponse, OrderItem, StartCheckoutRequest, StartCheckoutResponse } from "../types/commons";
import { TokensRequest } from "../types/skyflow";
import Skyflow from "skyflow-js";
import { ErrorResponse, IErrorResponse } from "./ErrorResponse";

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

  buildErrorResponseFromCatch(e: any): ErrorResponse {
    return new ErrorResponse({
      code: undefined,
      body: undefined,
      name: typeof e == "string" ? "catch" : (e as Error).name,
      message: typeof e == "string" ? e : (e as Error).message,
      stack: typeof e == "string" ? undefined : (e as Error).stack,
    })
  }

  async buildErrorResponse(
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

  async getBusiness(): Promise<Business | ErrorResponse> {
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

  async createOrder(orderItems: OrderItem): Promise<CreateOrderResponse[] | ErrorResponse> {
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
      if (response.ok) return await response.json() as CreateOrderResponse[];
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

  async startCheckoutRouter(routerData: StartCheckoutRequest): Promise<StartCheckoutResponse[] | ErrorResponse> {
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
      if (response.ok) return await response.json() as StartCheckoutResponse[];
      return await this.buildErrorResponse(response);
    } catch (e) {
      return this.buildErrorResponseFromCatch(e);
    }
  }

  async getSkyflowTokens({
    vault_id,
    vault_url,
    data,
  }: TokensRequest): Promise<any> {
    const skyflow = Skyflow.init({
      vaultID: vault_id,
      vaultURL: vault_url,
      getBearerToken: async () => await this.getVaultToken(),
      options: {
        logLevel: Skyflow.LogLevel.ERROR,
        env: Skyflow.Env.DEV,
      },
    });

    const collectContainer: any = skyflow.container(
      Skyflow.ContainerType.COLLECT
    );

    const fields = await Promise.all(
      Object.keys(data).map(async (key) => {
        const cardHolderNameElement = await collectContainer.create({
          table: "cards",
          column: key,
          type: Skyflow.ElementType.INPUT_FIELD,
        });
        return { element: cardHolderNameElement, key: key };
      })
    );

    const fieldPromises: Promise<any>[] = fields.map((field) => {
      return new Promise((resolve, reject) => {
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
    });

    const result = await Promise.all(fieldPromises);

    const mountFail = result.find((item: boolean) => !item);

    if (mountFail) {
      return { error: "Ocurrió un error al montar los campos de la tarjeta" };
    } else {
      try {
        const collectResponseSkyflowTonder = await collectContainer.collect();
        return collectResponseSkyflowTonder["records"][0]["fields"];
      } catch (error) {
        console.error("Por favor, verifica todos los campos de tu tarjeta");
        return { error: "Por favor, verifica todos los campos de tu tarjeta" };
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
}
