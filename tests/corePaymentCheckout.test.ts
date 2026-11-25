import { LiteCheckout } from "../src/classes/liteCheckout";
import { getBrowserInfo } from "../src/helpers/utils";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const API_KEY = "merchant-api-key";
const LEGACY = "https://stage.tonder.io";
const CORE = "https://api-stage.tonder.io";
const TRANSACTION_ID = "0192b8a0-0000-7000-8000-000000000001";

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
  id: TRANSACTION_ID,
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
  next_action: { verify_transaction_status_url: `/transactions/v1/${TRANSACTION_ID}` },
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
    if (url === `${CORE}/transactions/v1/customer`) {
      return reply({ status: 201, body: { customer_id: 1, email: "ana@example.com", first_name: "Ana", last_name: "", auth_token: "core-cust-token", auth_token_expires_at: "2026-11-20T12:00:00Z" } });
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

// A core customer's token is not valid on the monolith: the legacy order is placed by the
// customer the monolith registered, never by the one the core did.
function expectLegacyOrderOfLegacyCustomer(mock: jest.Mock) {
  expect(callsTo(mock, `${LEGACY}/api/v1/customer/`)).toHaveLength(1);
  const order = JSON.parse(callsTo(mock, `${LEGACY}/api/v1/orders/`)[0][1].body);
  expect(order.client).toBe("cust-token");
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
      skyflow_id: "sf-new",
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

  it.each([
    [400, { error: { code: "invalid_request", message: "bad body", type: "validation_error" }, request_id: "r" }],
    [409, { error: { code: "conflict", message: "busy", type: "conflict" } }],
    [429, { error: { code: "rate_limited", message: "slow down", type: "service_error" } }],
    [503, { error: { code: "retry_later", message: "later", type: "service_error" } }],
    [502, undefined],
  ])("rejects a %s with the checkout-router error shape, not the raw answer", async (status, body) => {
    installFetch({ flag: true, process: { status, body } });
    const { checkout } = buildCheckout();

    const failure = await checkout.payment(paymentData()).catch((e) => e);

    expect(failure.code).toBe(ErrorKeyEnum.PAYMENT_PROCESS_ERROR);
    expect(failure.statusCode).toBe(status);
    expect(failure.originalError.status).toBe(status);
    expect(failure.originalError.body).not.toHaveProperty("error");
    expect(failure.originalError.body).toEqual({
      status: String(status),
      message: (body as any)?.error?.message ?? "Error",
      psp_response: [],
      is_route_finished: false,
    });
  });

  it("keeps the status text the legacy refusal carries", async () => {
    const mock = installFetch({ flag: true });
    const base = mock.getMockImplementation()!;
    mock.mockImplementation(async (url: string, init?: any) =>
      url === `${CORE}/transactions/v1/process`
        ? { ...reply({ status: 400, body: { error: { code: "invalid_request", message: "bad" } } }), statusText: "Bad Request" }
        : base(url, init),
    );
    const { checkout } = buildCheckout();

    const failure = await checkout.payment(paymentData()).catch((e) => e);

    expect(failure.originalError.statusText).toBe("Bad Request");
  });

  it("carries the core's error code and the request id it sent in telemetry only", async () => {
    const mock = installFetch({
      flag: true,
      process: {
        status: 409,
        body: { error: { code: "conflict", message: "busy", type: "conflict" }, request_id: "req-9" },
      },
    });
    const { checkout } = buildCheckout();
    const flowFailed = jest.spyOn((checkout as any).telemetry, "flowFailed");

    const failure = await checkout.payment(paymentData()).catch((e) => e);

    const sentRequestId = callsTo(mock, `${CORE}/transactions/v1/process`)[0][1].headers["X-Request-Id"];
    expect(flowFailed).toHaveBeenCalledWith(
      "charge",
      expect.objectContaining({ error_code: "conflict", http_status: 409, request_id: sentRequestId }),
    );
    const merchantSees = JSON.stringify([failure.originalError, failure.details]);
    for (const leaked of ["conflict", "req-9"]) expect(merchantSees).not.toContain(leaked);
  });

  it("returns a 503 operations_disabled from the core to the merchant and makes no monolith request", async () => {
    const mock = installFetch({
      flag: true,
      process: {
        status: 503,
        body: { error: { code: "operations_disabled", message: "x", type: "service_error" } },
      },
    });
    const { checkout } = buildCheckout();

    await expect(checkout.payment(paymentData())).rejects.toMatchObject({ statusCode: 503 });

    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(1);
    expect(callsTo(mock, `${LEGACY}/api/v1/orders/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/customer/`)).toHaveLength(0);
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

  it("keeps an alternative payment method the core does not serve on the legacy flow", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();

    await checkout.payment(paymentData({ card: undefined, payment_method: "wallet" }));

    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(1);
    expectLegacyOrderOfLegacyCustomer(mock);
  });

  it.each([
    "oxxopay",
    "MercadoPago",
    "SAFETYPAYCASH",
    "safetypayTransfer",
    "neosurf",
    "qr",
    "Transfer",
  ])("charges the APM %s through the core with its type as written", async (code) => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();

    await checkout.payment(paymentData({ card: undefined, payment_method: code }));

    const [, init] = callsTo(mock, `${CORE}/transactions/v1/process`)[0];
    expect(init.headers).toMatchObject({
      Authorization: `Token ${API_KEY}`,
      "X-App-Origin": "sdk/ionic",
    });
    expect(JSON.parse(init.body)).toEqual({
      operation_type: "payment",
      amount: 100,
      currency: "MXN",
      client_reference: "TNDR-1",
      customer: { name: "Ana Lopez", email: "ana@example.com", phone: "555" },
      payment_method: { type: code },
      metadata: { order_id: "o-1" },
      return_url: "https://shop.example.com/done",
      items: ITEMS,
      browser_info: getBrowserInfo(),
    });
    expect(callsTo(mock, `${LEGACY}/api/v1/orders/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
  });

  it.each(["card", "CARD"])("keeps a card whose request carries payment_method '%s' a card payment with its tokens", async (type) => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();
    await checkout.injectCheckout();
    const customer = { id: 1, auth_token: "core-cust-token" };

    await checkout._handleCheckout({
      card: { card_number: "tok-n", cvv: "tok-c", expiration_month: "tok-m", expiration_year: "tok-y", cardholder_name: "tok-h" },
      payment_method: type,
      customer,
    });

    const [, init] = callsTo(mock, `${CORE}/transactions/v1/process`)[0];
    expect(JSON.parse(init.body).payment_method).toEqual({
      type: "CARD",
      card_number: "tok-n",
      cvv: "tok-c",
      expiration_month: "tok-m",
      expiration_year: "tok-y",
      cardholder_name: "tok-h",
    });
  });

  it("does not trim the APM type: a padded code stays on the legacy flow", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();

    await checkout.payment(paymentData({ card: undefined, payment_method: " oxxopay " }));

    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(1);
  });

  it("sends the merchant's apm_config beside the APM type", async () => {
    const mock = installFetch({ flag: true });
    const { checkout } = buildCheckout();
    const apm_config = { preference: { back_urls: { success: "https://shop.example.com/ok" } } };

    await checkout.payment(paymentData({ card: undefined, payment_method: "MercadoPago", apm_config }));

    const [, init] = callsTo(mock, `${CORE}/transactions/v1/process`)[0];
    expect(JSON.parse(init.body).payment_method).toEqual({ type: "MercadoPago", apm_config });
  });

  it("redirects the buyer to the APM page the core answers, as the legacy flow does", async () => {
    installFetch({
      flag: true,
      process: {
        status: 201,
        body: {
          ...CORE_SUCCESS,
          status: "Pending",
          transaction_status: "Pending",
          payment_method_type: "OXXOPAY",
          next_action: {
            redirect_to_url: {
              url: "https://payflow.example.com/oxxo-pay?token=display",
              return_url: "https://shop.example.com/done",
              verify_transaction_status_url: `/transactions/v1/${TRANSACTION_ID}`,
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
      void checkout.payment(paymentData({ card: undefined, payment_method: "oxxopay" }));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(JSON.parse(localStorage.getItem("verify_transaction_status_url")!)).toMatchObject({
        url: `/transactions/v1/${TRANSACTION_ID}`,
        engine: "core",
      });
      expect((window.location as any).href ?? window.location).toBe(
        "https://payflow.example.com/oxxo-pay?token=display",
      );
    } finally {
      Object.defineProperty(window, "location", realLocation);
    }
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
              verify_transaction_status_url: `/transactions/v1/${TRANSACTION_ID}`,
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
        url: `/transactions/v1/${TRANSACTION_ID}`,
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

  it("keeps an APM the core serves on the legacy flow", async () => {
    const mock = installFetch({ flag: false });
    const { checkout } = buildCheckout();

    await checkout.payment(paymentData({ card: undefined, payment_method: "oxxopay" }));

    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(1);
  });

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
  const VERIFY_PATH = `/transactions/v1/${TRANSACTION_ID}`;

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

  it("reads the core once, resumes nothing and answers the monolith transaction object", async () => {
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
      status: "Declined",
      transaction_status: "Declined",
      checkout_id: "chk-1",
      checkout: { id: "chk-1", is_route_finished: true },
    });
    for (const routerField of ["message", "is_route_finished", "decline_code", "psp_response", "actions"]) {
      expect(result).not.toHaveProperty(routerField);
    }
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("answers an approved payment with the monolith transaction object, not the body payment() resolves with", async () => {
    storeCoreState();
    const { checkout } = await startedCheckout({ status: 200, body: CORE_SUCCESS });

    const verified = await checkout.verify3dsTransaction();

    expect(verified).toMatchObject({ status: "Success", transaction_status: "Success" });
    expect(verified).not.toHaveProperty("actions");
    expect(verified).not.toHaveProperty("next_action");
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

const SPEI_URL = "https://payflow.example.com/spei?token=display";
const SPEI_PENDING = {
  ...CORE_SUCCESS,
  status: "Pending",
  transaction_status: "Pending",
  payment_method_type: "SPEI",
  clabe: "646180000000000001",
  bank_name: "STP",
  next_action: {
    redirect_to_url: {
      url: SPEI_URL,
      return_url: "https://shop.example.com/done",
      verify_transaction_status_url: `/transactions/v1/${TRANSACTION_ID}`,
    },
  },
};

// The legacy router answers a SPEI payment in the same shape (Direct API): Pending, the payflow
// link, and the CLABE and bank at the top level.
const SPEI_LEGACY = {
  status: "200",
  message: "Success",
  checkout_id: "legacy-chk",
  transaction_status: "Pending",
  transaction_id: 3,
  payment_id: 12,
  provider: "tonder",
  clabe: "646180000000000001",
  bank_name: "STP",
  next_action: SPEI_PENDING.next_action,
  psp_response: {},
  actions: [],
};

describe("SPEI payment", () => {
  const realLocation = Object.getOwnPropertyDescriptor(window, "location")!;
  beforeEach(() => localStorage.clear());
  afterEach(() => Object.defineProperty(window, "location", realLocation));

  it("flag OFF keeps SPEI on the legacy flow and hands the merchant the router's body", async () => {
    const mock = installFetch({ flag: false, router: { status: 201, body: SPEI_LEGACY } });
    const { checkout } = buildCheckout();
    stubLocation();

    void checkout.payment(paymentData({ card: undefined, payment_method: "Spei" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callsTo(mock, `${CORE}/transactions/v1/process`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(1);
    expect(window.location as unknown as string).toBe(SPEI_URL);
  });

  it.each(["SPEI", "spei", "Spei"])("flag ON sends SPEI written '%s' to the core as {type: 'SPEI'}", async (code) => {
    const mock = installFetch({ flag: true, process: { status: 201, body: SPEI_PENDING } });
    const { checkout } = buildCheckout();
    stubLocation();

    void checkout.payment(paymentData({ card: undefined, payment_method: code }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const [, init] = callsTo(mock, `${CORE}/transactions/v1/process`)[0];
    expect(JSON.parse(init.body).payment_method).toEqual({ type: "SPEI" });
    expect(callsTo(mock, `${LEGACY}/api/v1/orders/`)).toHaveLength(0);
    expect(callsTo(mock, `${LEGACY}/api/v1/checkout-router/`)).toHaveLength(0);
  });

  it("never sends the merchant's apm_config for SPEI: the core's schema refuses extra fields", async () => {
    const mock = installFetch({ flag: true, process: { status: 201, body: SPEI_PENDING } });
    const { checkout } = buildCheckout();
    stubLocation();

    void checkout.payment(paymentData({ card: undefined, payment_method: "spei", apm_config: { any: "thing" } }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const [, init] = callsTo(mock, `${CORE}/transactions/v1/process`)[0];
    expect(JSON.parse(init.body).payment_method).toEqual({ type: "SPEI" });
  });

  it("flag ON redirects to the payflow page and stores the verify URL, as the legacy flow does", async () => {
    installFetch({ flag: true, process: { status: 201, body: SPEI_PENDING } });
    const { checkout } = buildCheckout();
    stubLocation();

    void checkout.payment(paymentData({ card: undefined, payment_method: "SPEI" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.location as unknown as string).toBe(SPEI_URL);
    expect(JSON.parse(localStorage.getItem("verify_transaction_status_url")!)).toMatchObject({
      url: `/transactions/v1/${TRANSACTION_ID}`,
      engine: "core",
    });
  });

  it.each([
    ["flag ON", true, { status: 201, body: SPEI_PENDING }],
    ["flag OFF", false, { status: 201, body: SPEI_LEGACY }],
  ])("%s with the iframe presentation opens the page in the iframe, without resolving", async (_name, flag, answer) => {
    installFetch({
      flag,
      process: answer as Reply,
      router: answer as Reply,
    });
    const iframe = document.createElement("iframe");
    iframe.id = "tdsIframe";
    document.body.appendChild(iframe);
    const checkout = new LiteCheckout({
      mode: "stage",
      apiKey: API_KEY,
      returnUrl: "https://shop.example.com/done",
      callBack: jest.fn(),
      customization: { redirectOnComplete: false },
    });
    let resolved = false;

    void checkout.payment(paymentData({ card: undefined, payment_method: "SPEI" })).then(() => (resolved = true));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(iframe.getAttribute("src")).toBe(SPEI_URL);
    expect(resolved).toBe(false);
    document.body.innerHTML = "";
  });

  it("flag ON gives the merchant the legacy fields of a SPEI payment: clabe and bank_name included", async () => {
    installFetch({ flag: true, process: { status: 201, body: SPEI_PENDING } });
    const { checkout } = buildCheckout();
    stubLocation();
    let result: any;

    void checkout.payment(paymentData({ card: undefined, payment_method: "SPEI" })).then((r) => (result = r));
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The merchant's result is what the callback and the stored payload carry: read it from the 3DS handler.
    result = (checkout as any).process3ds.payload;

    expect(window.location as unknown as string).toBe(SPEI_URL);
    expect(result).toMatchObject({
      status: "200",
      message: "Success",
      transaction_status: "Pending",
      payment_id: 55,
      clabe: "646180000000000001",
      bank_name: "STP",
      next_action: SPEI_PENDING.next_action,
    });
  });

  it("omits clabe and bank_name when the core does not answer them", async () => {
    installFetch({ flag: true, process: { status: 201, body: { ...SPEI_PENDING, clabe: undefined, bank_name: undefined } } });
    const { checkout } = buildCheckout();
    stubLocation();

    void checkout.payment(paymentData({ card: undefined, payment_method: "SPEI" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = (checkout as any).process3ds.payload;
    expect("clabe" in payload).toBe(false);
    expect("bank_name" in payload).toBe(false);
  });
});

function stubLocation(): { href: string } {
  const stub = { href: "https://localhost/" };
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: stub });
  return stub;
}
