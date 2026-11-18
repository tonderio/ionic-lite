import { LiteCheckout } from "../src/classes/liteCheckout";
import { getBrowserInfo } from "../src/helpers/utils";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const API_KEY = "merchant-api-key";
const LEGACY = "https://stage.tonder.io";
const CORE = "https://api-stage.tonder.io";
const PUBLIC_ID = "0192b8a0-0000-7000-8000-000000000001";

const ITEMS = [
  {
    name: "Shirt",
    description: "Blue",
    quantity: 1,
    price_unit: 100,
    discount: 0,
    taxes: 0,
    product_reference: "sku-1",
    amount_total: 100,
  },
];

const CUSTOMER = { firstName: "Ana", lastName: "Lopez", email: "ana@example.com", phone: "555" };

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

const CORE_SUCCESS = {
  id: PUBLIC_ID,
  status: "Success",
  amount: 100,
  currency: "MXN",
  provider: "tonder",
  status_code: 201,
  payment_id: 55,
  transaction_id: "9",
  transaction_status: "Success",
  psp_response: { id: "psp-1" },
  routing: { checkout_id: "chk-1", is_route_finished: true },
  next_action: { verify_transaction_status_url: `/transactions/v1/${PUBLIC_ID}` },
};

const LEGACY_ROUTER_BODY = {
  status: "200",
  message: "Success",
  checkout_id: "legacy-chk",
  transaction_status: "Success",
  transaction_id: 3,
  payment_id: 12,
  provider: "tonder",
  next_action: {},
  psp_response: {},
  actions: [],
};

type Reply = { status: number; body: unknown };

function reply({ status, body }: Reply) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() {
      return this;
    },
  };
}

type Routes = {
  flag?: boolean;
  process?: Reply;
  router?: Reply;
};

function installFetch({ flag, process, router }: Routes): jest.Mock {
  const mock = jest.fn(async (url: string) => {
    if (url === `${CORE}/transactions/v1/business/config`) {
      return reply({ status: 200, body: config(flag) });
    }
    if (url === `${CORE}/transactions/v1/process`) {
      return reply(process ?? { status: 201, body: CORE_SUCCESS });
    }
    if (url === `${LEGACY}/api/v1/customer/`) {
      return reply({ status: 200, body: { id: 1, auth_token: "cust-token" } });
    }
    if (url === `${LEGACY}/api/v1/orders/`) return reply({ status: 201, body: { id: 21 } });
    if (url === `${LEGACY}/api/v1/business/7/payments/`) {
      return reply({ status: 201, body: { pk: 31 } });
    }
    if (url === `${LEGACY}/api/v1/checkout-router/`) {
      return reply(router ?? { status: 201, body: LEGACY_ROUTER_BODY });
    }
    throw new Error(`unexpected request to ${url}`);
  });
  (global as any).fetch = mock;
  return mock;
}

function callsTo(mock: jest.Mock, url: string) {
  return mock.mock.calls.filter(([called]) => called === url);
}

function paymentData(overrides: Record<string, unknown> = {}) {
  return {
    customer: CUSTOMER,
    cart: { total: 100, items: ITEMS },
    currency: "MXN",
    metadata: { order_id: "o-1" },
    card: "sf-saved",
    ...overrides,
  } as any;
}

function buildCheckout(callBack = jest.fn()) {
  const checkout = new LiteCheckout({
    mode: "stage",
    apiKey: API_KEY,
    returnUrl: "https://shop.example.com/done",
    callBack,
  });
  return { checkout, callBack };
}

describe("card payment with the flag ON", () => {
  it("charges through the core with today's key and no legacy order, payment or router", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();

    await checkout.injectCheckout();
    await checkout.payment(paymentData());

    const [url, init] = callsTo(mock, `${CORE}/transactions/v1/process`)[0];
    expect(url).toBe(`${CORE}/transactions/v1/process`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: `Token ${API_KEY}`,
      "Content-Type": "application/json",
      "X-App-Origin": "sdk/ionic",
    });
    expect(init.headers["X-Request-Id"]).toEqual(expect.any(String));
    expect(JSON.parse(init.body)).toEqual({
      operation_type: "payment",
      amount: 100,
      currency: "MXN",
      client_reference: "TNDR-1",
      customer: { name: "Ana Lopez", email: "ana@example.com", phone: "555" },
      payment_method: { type: "CARD", token: "sf-saved" },
      metadata: { order_id: "o-1" },
      return_url: "https://shop.example.com/done",
      items: ITEMS,
      browser_info: getBrowserInfo(),
    });
    expect(callsTo(mock, `${LEGACY}/api/v1/orders/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/business/7/payments/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
  });

  it("sends the merchant's order reference as the client reference", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();

    await checkout.payment(paymentData({ order_reference: "ORDER-77" }));

    const body = JSON.parse(callsTo(mock, `${CORE}/transactions/v1/process`)[0][1].body);
    expect(body.client_reference).toBe("ORDER-77");
  });

  it("sends the vault tokens of a new card", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();
    const tokens = {
      card_number: "tok-number",
      cvv: "tok-cvv",
      expiration_month: "tok-month",
      expiration_year: "tok-year",
      cardholder_name: "tok-name",
      skyflow_id: "sf-new",
    };
    (checkout as any).mountedElementsByContext.set("create", {
      elements: [],
      container: {
        container: { collect: async () => ({ records: [{ fields: tokens }] }) },
      },
    });

    await checkout.payment(paymentData({ card: undefined }));

    const body = JSON.parse(callsTo(mock, `${CORE}/transactions/v1/process`)[0][1].body);
    expect(body.payment_method).toEqual({
      type: "CARD",
      card_number: "tok-number",
      cvv: "tok-cvv",
      expiration_month: "tok-month",
      expiration_year: "tok-year",
      cardholder_name: "tok-name",
    });
  });

  it("resolves payment() and the callback with the rebuilt checkout-router body", async () => {
    installFetch({ flag: true });
    const { checkout, callBack } = buildCheckout();

    const result = await checkout.payment(paymentData());

    expect(result).toMatchObject({
      status: "200",
      message: "Success",
      checkout_id: "chk-1",
      transaction_status: "Success",
      transaction_id: 9,
      payment_id: 55,
      provider: "tonder",
    });
    expect(callBack).toHaveBeenCalledTimes(1);
    expect(callBack).toHaveBeenCalledWith(result);
  });

  it("uses a new request id for every payment", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();

    await checkout.payment(paymentData());
    await checkout.payment(paymentData());

    const ids = callsTo(mock, `${CORE}/transactions/v1/process`).map(
      ([, init]) => init.headers["X-Request-Id"],
    );
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("rejects a declined payment with the body the router used to answer", async () => {
    installFetch({
      flag: true,
      process: {
        status: 200,
        body: {
          ...CORE_SUCCESS,
          status: "Declined",
          status_code: 200,
          transaction_status: "Declined",
          decline_code: "05",
          decline_reason: "Do not honor",
          next_action: undefined,
          routing: {
            checkout_id: "chk-1",
            is_route_finished: true,
            decline_type: "Soft",
            rejected_psp_responses: [{ id: "r1" }],
          },
        },
      },
    });
    const { checkout, callBack } = buildCheckout();

    const failure = await checkout.payment(paymentData()).catch((e) => e);

    expect(failure.code).toBe(ErrorKeyEnum.PAYMENT_PROCESS_ERROR);
    expect(failure.statusCode).toBe(404);
    expect(failure.originalError).toEqual({
      status: 404,
      body: expect.objectContaining({
        status: "404",
        message: "Do not honor",
        transaction_status: "Declined",
        decline_code: "05",
        psp_response: [{ id: "r1" }],
      }),
    });
    expect(callBack).not.toHaveBeenCalled();
  });

  it("rejects the core's normalized 402 like a route that ended with no transaction", async () => {
    installFetch({
      flag: true,
      process: {
        status: 402,
        body: { error: { code: "payment_declined", message: "x", type: "business_error" } },
      },
    });
    const { checkout } = buildCheckout();

    const failure = await checkout.payment(paymentData()).catch((e) => e);

    expect(failure.code).toBe(ErrorKeyEnum.PAYMENT_PROCESS_ERROR);
    expect(failure.statusCode).toBe(404);
    expect(failure.originalError.body).toEqual({
      status: "404",
      message: "Error",
      psp_response: [],
      is_route_finished: true,
    });
  });

  it("rejects any other core error as a failed checkout, without a second try", async () => {
    const mock = installFetch({
      flag: true,
      process: {
        status: 503,
        body: { error: { code: "service_unavailable", message: "x", type: "service_error" } },
      },
    });
    const { checkout } = buildCheckout();

    const failure = await checkout.payment(paymentData()).catch((e) => e);

    expect(failure.code).toBe(ErrorKeyEnum.PAYMENT_PROCESS_ERROR);
    expect(failure.statusCode).toBe(503);
    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(1);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
  });

  it("retries once on the legacy flow when the kill switch refused the create", async () => {
    const mock = installFetch({
      flag: true,
      process: {
        status: 503,
        body: { error: { code: "operations_disabled", message: "x", type: "service_error" } },
      },
    });
    const { checkout } = buildCheckout();

    const result = await checkout.payment(paymentData());

    expect(result).toEqual(LEGACY_ROUTER_BODY);
    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(1);
    expect(callsTo(mock, `${LEGACY}/api/v1/orders/`)).toHaveLength(1);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(1);
  });

  it("sends the customer's identification as the legacy SDK did", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();
    const identification = { type: "RFC", number: "XAXX010101000" };

    await checkout.payment(paymentData({ customer: { ...CUSTOMER, identification } }));

    const body = JSON.parse(callsTo(mock, `${CORE}/transactions/v1/process`)[0][1].body);
    expect(body.customer.identification).toEqual(identification);
  });

  it("charges a Card on File payment through the core, with no flag in the request", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();
    await checkout.injectCheckout();
    checkout.configureCheckout({ customer: CUSTOMER, cart: { total: 100, items: ITEMS } } as any);

    await checkout._handleCheckout({
      card: { skyflow_id: "sf-saved" },
      customer: { id: 1, auth_token: "t" },
      enable_card_on_file: true,
    });

    const body = JSON.parse(callsTo(mock, `${CORE}/transactions/v1/process`)[0][1].body);
    expect(body.payment_method).toEqual({ type: "CARD", token: "sf-saved" });
    expect(JSON.stringify(body)).not.toContain("enable_card_on_file");
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
  });

  it.each([
    ["500 with the kill switch code", 500, "operations_disabled"],
    ["502", 502, "service_unavailable"],
    ["504", 504, "service_unavailable"],
    ["503 with another code", 503, "retry_later"],
  ])("never creates a second payment on legacy after a %s", async (_label, status, code) => {
    const mock = installFetch({
      flag: true,
      process: { status, body: { error: { code, message: "x", type: "service_error" } } },
    });
    const { checkout } = buildCheckout();

    await expect(checkout.payment(paymentData())).rejects.toMatchObject({ statusCode: status });

    expect(callsTo(mock, `${LEGACY}/api/v1/orders/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
  });

  it("never creates a second payment on legacy after a network error", async () => {
    const mock = installFetch({ flag: true });
    const base = mock.getMockImplementation()!;
    mock.mockImplementation(async (url: string, init?: any) => {
      if (url === `${CORE}/transactions/v1/process`) throw new TypeError("Failed to fetch");
      return base(url, init);
    });
    const { checkout } = buildCheckout();

    await expect(checkout.payment(paymentData())).rejects.toBeDefined();

    expect(callsTo(mock, `${LEGACY}/api/v1/orders/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
  });

  it.each(["CARD", "Card", "card"])(
    "charges a payment() with the '%s' payment method through the core",
    async (type) => {
      const mock = installFetch({ flag: true });
      const { checkout } = buildCheckout();

      await checkout.payment(paymentData({ payment_method: type }));

      const body = JSON.parse(callsTo(mock, `${CORE}/transactions/v1/process`)[0][1].body);
      expect(body.payment_method).toEqual({ type: "CARD", token: "sf-saved" });
      expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
    },
  );

  it("keeps an alternative payment method on the legacy flow", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();

    await checkout.payment(paymentData({ card: undefined, payment_method: "oxxopay" }));

    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(1);
  });

  it("keeps the engine of a payment with the 3DS state it stores", async () => {
    installFetch({
      flag: true,
      process: {
        status: 201,
        body: {
          ...CORE_SUCCESS,
          status: "Pending",
          transaction_status: "Pending",
          routing: { checkout_id: "chk-1", is_route_finished: false },
          next_action: {
            redirect_to_url: {
              url: "https://payflow.example.com/process?token=t#session=s",
              return_url: "https://shop.example.com/done",
              verify_transaction_status_url: `/transactions/v1/${PUBLIC_ID}`,
            },
          },
        },
      },
    });
    const { checkout } = buildCheckout();
    const realLocation = Object.getOwnPropertyDescriptor(window, "location")!;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "https://localhost/" },
    });

    try {
      void checkout.payment(paymentData());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(JSON.parse(localStorage.getItem("verify_transaction_status_url")!)).toMatchObject({
        url: `/transactions/v1/${PUBLIC_ID}`,
        engine: "core",
      });
      expect((window.location as any).href ?? window.location).toBe(
        "https://payflow.example.com/process?token=t#session=s",
      );
    } finally {
      Object.defineProperty(window, "location", realLocation);
    }
  });
});

describe("card payment with the flag OFF", () => {
  beforeEach(() => localStorage.clear());

  it.each(["CARD", "card"])(
    "sends a '%s' payment method to checkout-router exactly as the merchant gave it",
    async (type) => {
      const mock = installFetch({ flag: false });
      const { checkout } = buildCheckout();

      await checkout.payment(paymentData({ card: undefined, payment_method: type }));

      const body = JSON.parse(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)[0][1].body);
      expect(body.payment_method).toBe(type);
      expect(body).not.toHaveProperty("card");
      expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(0);
    },
  );

  it.each([
    ["false", false],
    ["missing", undefined],
  ])("keeps today's legacy flow when the flag is %s", async (_label, flag) => {
    const mock = installFetch({ flag });
    const { checkout, callBack } = buildCheckout();

    const result = await checkout.payment(paymentData());

    expect(result).toEqual(LEGACY_ROUTER_BODY);
    expect(callBack).toHaveBeenCalledWith(LEGACY_ROUTER_BODY);
    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(0);
    const order = mock.mock.calls
      .map(([url]) => url as string)
      .filter((url) => url.startsWith(`${LEGACY}/api/v1/`) && !url.endsWith("/customer/"));
    expect(order).toEqual([
      `${LEGACY}/api/v1/orders/`,
      `${LEGACY}/api/v1/business/7/payments/`,
      `${LEGACY}/api/v1/checkout-router/`,
    ]);
    const routerBody = JSON.parse(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)[0][1].body);
    expect(routerBody).toMatchObject({
      order_id: 21,
      payment_id: 31,
      business_id: 7,
      source: "sdk",
      card: { skyflow_id: "sf-saved" },
    });
  });
});

describe("verify3dsTransaction of a core payment", () => {
  const STORAGE_KEY = "verify_transaction_status_url";
  const VERIFY_PATH = `/transactions/v1/${PUBLIC_ID}`;

  function storeCoreState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: VERIFY_PATH, engine: "core", expires: Date.now() + 60_000 }),
    );
  }

  async function startedCheckout(getBody: Reply) {
    const mock = installFetch({ flag: true });
    const base = mock.getMockImplementation()!;
    mock.mockImplementation(async (url: string, init?: any) =>
      url === `${CORE}${VERIFY_PATH}` ? reply(getBody) : base(url, init),
    );
    const { checkout } = buildCheckout();
    await checkout.injectCheckout();
    return { mock, checkout };
  }

  beforeEach(() => localStorage.clear());

  it("reads the core once, resumes nothing and answers the rebuilt checkout-router body", async () => {
    storeCoreState();
    const { mock, checkout } = await startedCheckout({
      status: 200,
      body: {
        ...CORE_SUCCESS,
        status: "Declined",
        transaction_status: "Declined",
        decline_code: "05",
        decline_reason: "Do not honor",
        next_action: undefined,
        routing: {
          checkout_id: "chk-1",
          is_route_finished: true,
          decline_type: "Soft",
          rejected_psp_responses: [{ id: "r1" }, { id: "r2" }],
        },
      },
    });

    const result = await checkout.verify3dsTransaction();

    expect(callsTo(mock, `${CORE}${VERIFY_PATH}`)).toHaveLength(1);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
    expect(result).toMatchObject({
      status: "404",
      message: "Do not honor",
      checkout_id: "chk-1",
      is_route_finished: true,
      transaction_status: "Declined",
      decline_code: "05",
      psp_response: [{ id: "r1" }, { id: "r2" }],
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("answers an approved payment with the same body payment() resolves with", async () => {
    storeCoreState();
    const { checkout } = await startedCheckout({ status: 200, body: CORE_SUCCESS });

    const verified = await checkout.verify3dsTransaction();

    const { checkout: other } = buildCheckout();
    installFetch({ flag: true });
    const paid = await other.payment(paymentData());
    expect(verified).toEqual(paid);
  });

  it("keeps the 3DS state while the core payment is not final", async () => {
    storeCoreState();
    const { checkout } = await startedCheckout({
      status: 200,
      body: { ...CORE_SUCCESS, status: "Pending", transaction_status: "Pending" },
    });

    const result = await checkout.verify3dsTransaction();

    expect(result).toMatchObject({ transaction_status: "Pending" });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ engine: "core" });
  });
});
