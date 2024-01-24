import { TokensRequest } from "../types/skyflow.ds";
import Skyflow from "skyflow-js";

declare global {
  interface Window { OpenPay: any; }
}

export async function getOpenpayDeviceSessionID(merchant_id: string, public_key: string, signal: AbortSignal) {
  let openpay = await window.OpenPay;
  openpay.setId(merchant_id);
  openpay.setApiKey(public_key);
  openpay.setSandboxMode(true);
  var response = await openpay.deviceData.setup({signal});
  return response;
}

export async function getBusiness(baseUrlTonder: string, signal: AbortSignal, apiKeyTonder?: string) {
  const getBusiness = await fetch(
    `${baseUrlTonder}/api/v1/payments/business/${apiKeyTonder}`,
    {
      headers: {
        Authorization: `Token ${apiKeyTonder}`,
      },
      signal: signal,
    }
  );
  const response = await getBusiness.json();
  return response
}

export async function customerRegister(baseUrlTonder: string, email: string, signal: AbortSignal, apiKeyTonder?: string) {
  const url = `${baseUrlTonder}/api/v1/customer/`;
  const data = { email: email };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKeyTonder}`,
    },
    signal: signal,
    body: JSON.stringify(data),
  });

  if (response.status === 201) {
    const jsonResponse = await response.json();
    return jsonResponse;
  } else {
    throw new Error(`Error: ${response.statusText}`);
  }
}

export async function createOrder(baseUrlTonder: string, orderItems: any, apiKeyTonder?: string) {
  const url = `${baseUrlTonder}/api/v1/orders/`;
  const data = orderItems;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKeyTonder}`,
    },
    body: JSON.stringify(data),
  });
  if (response.status === 201) {
    const jsonResponse = await response.json();
    return jsonResponse;
  } else {
    throw new Error(`Error: ${response.statusText}`);
  }
}

export async function createPayment(baseUrlTonder: string, paymentItems: { business_pk: string }, apiKeyTonder?: string) {
  const url = `${baseUrlTonder}/api/v1/business/${paymentItems.business_pk}/payments/`;
  const data = paymentItems;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKeyTonder}`,
    },
    body: JSON.stringify(data),
  });
  if (response.status >= 200 && response.status <=299) {
    const jsonResponse = await response.json();
    return jsonResponse;
  } else {
    throw new Error(`Error: ${response.statusText}`);
  }
}

export async function startCheckoutRouter(baseUrlTonder: string, routerItems: any, apiKeyTonder?: string) {
  try {
    const url = `${baseUrlTonder}/api/v1/checkout-router/`;
    const data = routerItems;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKeyTonder}`,
      },
      body: JSON.stringify(data),
    });
    if (response.status >= 200 && response.status <= 299) {
      const jsonResponse = await response.json();
      return jsonResponse;
    } else {
      throw new Error("Failed to start checkout router")
    }
  } catch (error) {
    throw error
  }
}

export async function getSkyflowTokens({ baseUrl, apiKey, vault_id, vault_url, signal, data }: TokensRequest): Promise<any> {

  const skyflow = Skyflow.init({
    vaultID: vault_id,
    vaultURL: vault_url,
    getBearerToken: async () => await getVaultToken({ baseUrl, apiKey, signal }),
    options: {
      logLevel: Skyflow.LogLevel.ERROR,
      env: Skyflow.Env.DEV,
    },
  });

  const collectContainer: any = skyflow.container(
    Skyflow.ContainerType.COLLECT
  );

  const fields = await Promise.all(Object.keys(data).map(async (key) => {
    const cardHolderNameElement = await collectContainer.create({
      table: "cards",
      column: key,
      type: Skyflow.ElementType.INPUT_FIELD
    });
    return { element: cardHolderNameElement, key: key};
  }))

  const fieldPromises: Promise<any>[] = fields.map((field) => {
    return new Promise((resolve, reject) => {
      const div = document.createElement("div")
      div.hidden = true;
      div.id = `id-${field.key}`
      document.querySelector(`body`)?.appendChild(div);
      setTimeout(() => {
        field.element.mount(`#id-${field.key}`)
        setInterval(() => {
          if(field.element.isMounted()) {
            const value = data[field.key];
            field.element.update({ value: value });
            return resolve(field.element.isMounted())
          }
        }, 120)
      }, 120)
    })
  })
  

  const result = await Promise.all(fieldPromises)

  const mountFail = result.find((item: boolean) => !item)

  if(mountFail) {
    return { error: "Ocurrió un error al montar los campos de la tarjeta" }
  } else {
    try {
      const collectResponseSkyflowTonder = await collectContainer.collect();
      return collectResponseSkyflowTonder["records"][0]["fields"];
    } catch (error) {
      console.error("Por favor, verifica todos los campos de tu tarjeta")
      return { error: "Por favor, verifica todos los campos de tu tarjeta" }
    }
  }

}

export async function getVaultToken({ baseUrl, apiKey, signal }: { baseUrl: string, apiKey: string, signal: AbortSignal }) {
  const response = await fetch(`${baseUrl}/api/v1/vault-token/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${apiKey}`
    },
    signal: signal,
  });

  if (response.ok) {
    const responseBody = await response.json();
    return responseBody.token;
  } else {
    throw new Error('Failed to retrieve bearer token');
  }
}
