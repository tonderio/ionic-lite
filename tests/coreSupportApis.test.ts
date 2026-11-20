import Skyflow from "skyflow-js";
import { LiteCheckout } from "../src/classes/liteCheckout";
import { fetchCustomerCards, saveCustomerCard } from "../src/data/cardApi";
import { fetchCustomerPaymentMethods } from "../src/data/paymentMethodApi";
import { getVaultToken } from "../src/data/skyflowApi";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const API_KEY = "merchant-api-key";
const SECURE_TOKEN = "secure-token-value";
const LEGACY = "https://stage.tonder.io";
const CORE = "https://api-stage.tonder.io";
const CUSTOMER_TOKEN = "customer-token";

const CORE_CARDS = {
  customer_id: 9,
  data: [
    {
      id: "sf-1",
      card_number: "XXXX-XXXX-XXXX-1111",
      expiration_month: "12",
      expiration_year: "30",
      card_scheme: "VISA",
      subscription_id: "sub-1",
    },
  ],
};

const CORE_PAYMENT_METHODS = {
  data: [
    {
      id: "0192b8a0-0000-7000-8000-0000000000aa",
      payment_method: "OXXO",
      category: "Cash",
      acquirer: "Kushki",
      status: "active",
      priority: 1,
      unavailable_countries: [],
    },
  ],
};

const CARDS = { user_id: 9, cards: [{ fields: { skyflow_id: "sf-1", card_scheme: "VISA", subscription_id: "sub-1" } }] };

function config(flag: boolean | undefined) {
  return {
    business: { pk: 7, name: "Shop" },
    openpay_keys: { merchant_id: "", public_key: "" },
    mercado_pago: { active: false },
    vault_id: "vault",
    vault_url: "https://vault.example.com",
    reference: "TNDR-1",
    ...(flag === undefined ? {} : { core_payments_enabled: flag }),
  };
}

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() {
      return this;
    },
  };
}

function installFetch(flag: boolean | undefined): jest.Mock {
  const mock = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const route = `${method} ${url}`;
    switch (route) {
      case `GET ${CORE}/transactions/v1/business/config`:
        return reply(200, config(flag));
      case `POST ${CORE}/transactions/v1/customer`:
        return reply(201, { customer_id: 9, email: "ana@example.com", first_name: "Ana", last_name: "", auth_token: "core-customer-token", auth_token_expires_at: "2026-11-20T12:00:00Z" });
      case `POST ${LEGACY}/api/v1/customer/`:
        return reply(200, { id: 9, auth_token: "legacy-customer-token", email: "ana@example.com" });
      case `GET ${CORE}/transactions/v1/cards`:
        return reply(200, CORE_CARDS);
      case `GET ${LEGACY}/api/v1/business/7/cards/`:
        return reply(200, CARDS);
      case `DELETE ${CORE}/transactions/v1/cards/sf-1`:
        return reply(204, undefined);
      case `DELETE ${LEGACY}/api/v1/business/7/cards/sf-1`:
        return reply(204, undefined);
      case `POST ${CORE}/transactions/v1/cards`:
        return reply(201, { id: "sf-2", customer_id: 9, subscription_id: "sub-2", card_scheme: "VISA", card_bin: "411111" });
      case `POST ${LEGACY}/api/v1/business/7/cards/`:
        return reply(201, { skyflow_id: "sf-2", user_id: 9 });
      case `GET ${CORE}/transactions/v1/payment_methods?status=active&pagesize=10000`:
        return reply(200, CORE_PAYMENT_METHODS);
      case `GET ${CORE}/transactions/v1/vault-token`:
        return reply(200, { token: "vault-bearer" });
      default:
        throw new Error(`unexpected request ${route}`);
    }
  });
  (global as any).fetch = mock;
  return mock;
}

function calls(mock: jest.Mock, route: string) {
  return mock.mock.calls.filter(([url, init]) => `${init?.method ?? "GET"} ${url}` === route);
}

function headersOf(call: any[]): Record<string, string> {
  const lower: Record<string, string> = {};
  for (const [name, value] of Object.entries((call[1]?.headers ?? {}) as Record<string, string>)) {
    lower[name.toLowerCase()] = value;
  }
  return lower;
}

async function ready() {
  const checkout = new LiteCheckout({ mode: "stage", apiKey: API_KEY });
  checkout.configureCheckout({ customer: { email: "ana@example.com" }, secureToken: SECURE_TOKEN } as any);
  return checkout;
}

describe("support APIs with the core flag ON", () => {
  it("registers the customer on the core with the key the payment uses", async () => {
    const fetchMock = installFetch(true);
    const checkout = await ready();

    await checkout.getCustomerCards();

    const [call] = calls(fetchMock, `POST ${CORE}/transactions/v1/customer`);
    expect(headersOf(call).authorization).toBe(`Token ${API_KEY}`);
    expect(JSON.parse(call[1].body)).toMatchObject({ email: "ana@example.com" });
    expect(calls(fetchMock, `POST ${LEGACY}/api/v1/customer/`)).toHaveLength(0);
  });

  it("lists the saved cards on the core with only the secure token and the customer's token", async () => {
    const fetchMock = installFetch(true);
    const checkout = await ready();

    const result = await checkout.getCustomerCards();

    const [call] = calls(fetchMock, `GET ${CORE}/transactions/v1/cards`);
    const headers = headersOf(call);
    expect(headers.authorization).toBe(`Bearer ${SECURE_TOKEN}`);
    expect(headers["user-token"]).toBe("core-customer-token");
    expect(headers["x-app-origin"]).toBeUndefined();
    expect(result).toMatchObject({
      user_id: 9,
      cards: [
        {
          fields: {
            skyflow_id: "sf-1",
            card_number: "XXXX-XXXX-XXXX-1111",
            expiration_month: "12",
            expiration_year: "30",
            card_scheme: "VISA",
          },
        },
      ],
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith(LEGACY))).toBe(false);
  });

  it("adds a card on the core without the business in the path", async () => {
    const fetchMock = installFetch(true);

    const answer = await saveCustomerCard(
      { engine: "core", baseUrl: CORE },
      "core-customer-token",
      SECURE_TOKEN,
      7,
      { skyflow_id: "sf-2", subscription_id: "sub-2" } as any,
      true,
    );

    const [call] = calls(fetchMock, `POST ${CORE}/transactions/v1/cards`);
    expect(headersOf(call)).toMatchObject({
      authorization: `Bearer ${SECURE_TOKEN}`,
      "user-token": "core-customer-token",
      "x-app-origin": "sdk/ionic",
    });
    expect(JSON.parse(call[1].body)).toEqual({ skyflow_id: "sf-2", subscription_id: "sub-2" });
    expect(answer).toEqual({ skyflow_id: "sf-2", user_id: 9, card_bin: "411111" });
  });

  it("removes a card on the core by its skyflow id", async () => {
    const fetchMock = installFetch(true);
    const checkout = await ready();

    await checkout.removeCustomerCard("sf-1");

    const [call] = calls(fetchMock, `DELETE ${CORE}/transactions/v1/cards/sf-1`);
    expect(headersOf(call)).toMatchObject({
      authorization: `Bearer ${SECURE_TOKEN}`,
      "user-token": "core-customer-token",
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith(LEGACY))).toBe(false);
  });

  it("keeps answering an empty list when the core refuses the secure token", async () => {
    const fetchMock = installFetch(true);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${CORE}/transactions/v1/cards` ? reply(401, {}) : original(url, init),
    );
    const checkout = await ready();

    const result = await checkout.getCustomerCards();

    expect(result).toEqual({ user_id: 0, cards: [] });
  });
});

describe("what the core answers becomes what the SDK returned before", () => {
  it("rebuilds the payment methods list the paged answer had", async () => {
    installFetch(true);

    const answer = await fetchCustomerPaymentMethods(CORE, API_KEY);

    expect(answer).toMatchObject({
      count: 1,
      next: null,
      previous: null,
      results: [{ pk: "0192b8a0-0000-7000-8000-0000000000aa", payment_method: "OXXO", category: "Cash", priority: 1 }],
    });
  });

  it("keeps the subscription id of a saved card", async () => {
    installFetch(true);

    const answer = await fetchCustomerCards({ engine: "core", baseUrl: CORE }, "t", SECURE_TOKEN, 7);

    expect(answer.cards[0].fields.subscription_id).toBe("sub-1");
  });

  it("keeps the fields of the card add answer the SDK used", async () => {
    installFetch(true);

    const answer = await saveCustomerCard({ engine: "core", baseUrl: CORE }, "t", SECURE_TOKEN, 7, { skyflow_id: "sf-2" } as any);

    expect(Object.keys(answer).sort()).toEqual(["card_bin", "skyflow_id", "user_id"]);
  });

  it.each([
    [409, "card_limit_reached", { limit: 10 }],
    [409, "customer_phone_required", undefined],
    [503, "dependency_unavailable", undefined],
    [404, "not_found", undefined],
  ])("keeps SAVE_CARD_ERROR for a %s %s, with the core's code as the system error", async (status, code, details) => {
    const fetchMock = installFetch(true);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${CORE}/transactions/v1/cards` && init?.method === "POST"
        ? reply(status, { error: { code, message: "refused", type: "x", ...(details ? { details } : {}) }, request_id: "r-1" })
        : original(url, init),
    );

    const failure = await saveCustomerCard({ engine: "core", baseUrl: CORE }, "t", SECURE_TOKEN, 7, { skyflow_id: "sf-2" } as any).catch((e) => e);

    expect(failure.code).toBe(ErrorKeyEnum.SAVE_CARD_ERROR);
    expect(failure.statusCode).toBe(status);
    expect(failure.details.systemError).toBe(code);
  });
});

describe("support APIs with the core flag OFF", () => {
  it.each([false, undefined])("keeps customer and cards on the monolith (flag %s)", async (flag) => {
    const fetchMock = installFetch(flag);
    const checkout = await ready();

    await checkout.getCustomerCards();
    await checkout.removeCustomerCard("sf-1");

    const [customerCall] = calls(fetchMock, `POST ${LEGACY}/api/v1/customer/`);
    expect(headersOf(customerCall).authorization).toBe(`Token ${API_KEY}`);
    const [listCall] = calls(fetchMock, `GET ${LEGACY}/api/v1/business/7/cards/`);
    expect(headersOf(listCall)).toMatchObject({
      authorization: `Bearer ${SECURE_TOKEN}`,
      "user-token": "legacy-customer-token",
    });
    expect(calls(fetchMock, `DELETE ${LEGACY}/api/v1/business/7/cards/sf-1`)).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith(`${CORE}/transactions/v1/customer`))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith(`${CORE}/transactions/v1/cards`))).toBe(false);
  });

  it("still adds a card on the monolith with the business in the path", async () => {
    const fetchMock = installFetch(false);

    await saveCustomerCard(
      { engine: "legacy", baseUrl: LEGACY },
      "legacy-customer-token",
      SECURE_TOKEN,
      7,
      { skyflow_id: "sf-2" } as any,
    );

    const [call] = calls(fetchMock, `POST ${LEGACY}/api/v1/business/7/cards/`);
    expect(headersOf(call)["user-token"]).toBe("legacy-customer-token");
  });
});

describe.each([true, false, undefined])("support APIs that always go to the core (flag %s)", (flag) => {
  it("lists the payment methods on the core with the same query and key", async () => {
    const fetchMock = installFetch(flag);
    const checkout = await ready();

    const methods = await checkout.getCustomerPaymentMethods();

    const [call] = calls(fetchMock, `GET ${CORE}/transactions/v1/payment_methods?status=active&pagesize=10000`);
    expect(headersOf(call).authorization).toBe(`Token ${API_KEY}`);
    expect(methods.map((m) => m.payment_method)).toEqual(["OXXO"]);
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith(LEGACY))).toBe(false);
  });

  it("asks the core for the vault token", async () => {
    const fetchMock = installFetch(flag);

    const token = await getVaultToken(CORE, API_KEY);

    const [call] = calls(fetchMock, `GET ${CORE}/transactions/v1/vault-token`);
    expect(headersOf(call).authorization).toBe(`Token ${API_KEY}`);
    expect(token).toBe("vault-bearer");
  });

  it("hands the Skyflow instance a vault-token getter that reads the core", async () => {
    const fetchMock = installFetch(flag);
    const checkout = await ready();

    const init = jest.spyOn(Skyflow, "init").mockImplementation((config: any) => config);
    await (checkout as any).createSkyflowInstance();
    const { getBearerToken } = init.mock.calls[0][0] as any;
    init.mockRestore();

    expect(await getBearerToken()).toBe("vault-bearer");
    expect(calls(fetchMock, `GET ${CORE}/transactions/v1/vault-token`)).toHaveLength(1);
  });
});

describe("the deprecated methods follow the same split", () => {
  it("getActiveAPMs reads the core with the query it sent before", async () => {
    const fetchMock = installFetch(false);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      String(url).startsWith(`${CORE}/transactions/v1/payment_methods?`)
        ? reply(200, CORE_PAYMENT_METHODS)
        : original(url, init),
    );
    const checkout = await ready();

    const apms = await checkout.getActiveAPMs();

    expect(apms).toHaveLength(1);
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toContain(
      `${CORE}/transactions/v1/payment_methods?status=active&page_size=10000&country=México`,
    );
    expect(urls.some((url) => url.startsWith(LEGACY))).toBe(false);
  });

  it("customerRegister follows the flag", async () => {
    const fetchMock = installFetch(true);
    const checkout = await ready();

    const customer = await checkout.customerRegister("ana@example.com");

    expect(customer).toMatchObject({ id: 9, email: "ana@example.com", auth_token: "core-customer-token", first_name: "Ana" });
    expect(calls(fetchMock, `POST ${CORE}/transactions/v1/customer`)).toHaveLength(1);
    expect(calls(fetchMock, `POST ${LEGACY}/api/v1/customer/`)).toHaveLength(0);
  });

  it("a failed customer call still rejects with CUSTOMER_OPERATION_ERROR", async () => {
    const fetchMock = installFetch(true);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${CORE}/transactions/v1/customer` ? reply(500, {}) : original(url, init),
    );
    const checkout = await ready();

    await expect(checkout.getCustomerCards()).rejects.toMatchObject({ code: ErrorKeyEnum.FETCH_CARDS_ERROR });
  });
});
