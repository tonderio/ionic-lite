import { LiteCheckout } from "../src/classes/liteCheckout";
import { ThreeDSHandler } from "../src/classes/3dsHandler";
import packageJson from "../package.json";

const API_KEY = "merchant-api-key";
const LEGACY = "https://stage.tonder.io";
const CORE = "https://api-stage.tonder.io";
const TELEMETRY = `${CORE}/telemetry/v1/events`;
const TRANSACTION_ID = "0192b8a0-0000-7000-8000-000000000001";

const CONFIG = {
  business: { pk: 7, name: "Shop" },
  openpay_keys: { merchant_id: "", public_key: "" },
  mercado_pago: { active: false },
  vault_id: "vault",
  vault_url: "https://vault.example.com",
  reference: "TNDR-1",
  core_payments_enabled: true,
};

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, clone() { return this; } };
}

function installFetch(process: { status: number; body: unknown } = { status: 201, body: { id: TRANSACTION_ID, status: "Success", amount: 100, currency: "MXN", provider: "tonder", payment_id: 55, transaction_id: "9", transaction_status: "Success", routing: { checkout_id: "c", is_route_finished: true } } }) {
  const mock = jest.fn(async (url: string, _init?: any) => {
    if (url === `${CORE}/transactions/v1/business/config`) return reply(200, CONFIG);
    if (url === `${CORE}/transactions/v1/customer`) {
      return reply(201, { customer_id: 1, email: "ana@example.com", first_name: "Ana", last_name: "", auth_token: "tok", auth_token_expires_at: "2026-11-20T12:00:00Z" });
    }
    if (url === `${CORE}/transactions/v1/process`) return reply(process.status, process.body);
    if (url === TELEMETRY) return reply(202, {});
    throw new Error(`unexpected request to ${url}`);
  });
  (global as any).fetch = mock;
  return mock;
}

function build() {
  return new LiteCheckout({ mode: "stage", apiKey: API_KEY, returnUrl: "https://shop.example.com/done", callBack: jest.fn() });
}

async function sentEvents(mock: jest.Mock, checkout: LiteCheckout) {
  // payment() resolves from inside its timed step, which reports a tick later.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (checkout as any).telemetry.flush();
  const batches = mock.mock.calls.filter(([url]) => url === TELEMETRY).map(([, init]) => ({ init, body: JSON.parse(init.body) }));
  return { batches, events: batches.flatMap((b) => b.body.events) as any[] };
}

const PAYMENT = {
  customer: { firstName: "Ana", lastName: "Lopez", email: "ana@example.com", phone: "555" },
  cart: { total: 100, items: [] },
  currency: "MXN",
  metadata: { order_id: "o-1" },
  card: "sf-saved",
} as any;

describe("SDK telemetry with the shared client", () => {
  it("names the SDK 'ionic-lite' with the version built into the package and sends the key like its other calls", async () => {
    const mock = installFetch();
    const checkout = build();
    await checkout.injectCheckout();

    const { batches } = await sentEvents(mock, checkout);

    expect(batches[0].body.sdk).toEqual({ name: "ionic-lite", version: packageJson.version });
    expect(batches[0].init.headers.Authorization).toBe(`Token ${API_KEY}`);
  });

  it("reports a method call at the entry of a public method, deprecated ones flagged", async () => {
    const mock = installFetch();
    const checkout = build();
    await checkout.injectCheckout();
    await checkout.getActiveAPMs().catch(() => undefined);

    const { events } = await sentEvents(mock, checkout);

    expect(events).toContainEqual({ name: "method.called", method: "injectCheckout" });
    expect(events).toContainEqual({ name: "method.called", method: "getActiveAPMs" });
  });

  it("reports the payment steps with outcome, duration, status, operation id and the X-Request-Id it sent", async () => {
    const mock = installFetch();
    const checkout = build();
    await checkout.injectCheckout();

    await checkout.payment(PAYMENT);
    const { events } = await sentEvents(mock, checkout);

    const sentRequestId = mock.mock.calls.find(([url]) => url === `${CORE}/transactions/v1/process`)![1].headers["X-Request-Id"];
    const charge = events.find((e) => e.name === "flow.step" && e.step === "charge");
    expect(charge).toMatchObject({
      outcome: "ok",
      http_status: 201,
      payment_method_type: "CARD",
      operation_id: TRANSACTION_ID,
      request_id: sentRequestId,
    });
    expect(charge.duration_ms).toEqual(expect.any(Number));
    expect(events.find((e) => e.name === "flow.step" && e.step === "payment")).toMatchObject({ outcome: "ok" });
  });

  it("sends exactly the start, customer, charge and result of a payment, with the method call", async () => {
    const mock = installFetch();
    const checkout = build();
    await checkout.injectCheckout();

    await checkout.payment(PAYMENT);
    const { events } = await sentEvents(mock, checkout);

    expect(events.map((e) => [e.name, e.method ?? e.step])).toEqual([
      ["method.called", "injectCheckout"],
      ["method.called", "payment"],
      ["flow.step", "start"],
      ["flow.step", "customer"],
      ["flow.step", "charge"],
      ["flow.step", "payment"],
    ]);
  });

  it("sends only the method call for getCustomerCards, with no payment customer step", async () => {
    const mock = installFetch();
    const checkout = build();
    await checkout.injectCheckout();
    jest.spyOn(checkout as any, "_getCustomerCards").mockResolvedValue({ cards: [] });

    await checkout.getCustomerCards();
    const { events } = await sentEvents(mock, checkout);

    expect(events.map((e) => [e.name, e.method ?? e.step])).toEqual([
      ["method.called", "injectCheckout"],
      ["method.called", "getCustomerCards"],
    ]);
  });

  it("sends nothing but the method call when a non-payment method fails", async () => {
    const mock = installFetch();
    const checkout = build();
    await checkout.injectCheckout();
    jest.spyOn(checkout as any, "_getCustomer").mockRejectedValue(new Error("boom"));

    await expect(checkout.getCustomerCards()).rejects.toBeDefined();
    const { events } = await sentEvents(mock, checkout);

    expect(events.map((e) => [e.name, e.method ?? e.step])).toEqual([
      ["method.called", "injectCheckout"],
      ["method.called", "getCustomerCards"],
    ]);
  });

  it("reports a refused payment as a failed step with the core's code and status", async () => {
    const mock = installFetch({ status: 503, body: { error: { code: "operations_disabled", message: "x", type: "service_error" } } });
    const checkout = build();
    await checkout.injectCheckout();

    await expect(checkout.payment(PAYMENT)).rejects.toMatchObject({ statusCode: 503 });
    const { events } = await sentEvents(mock, checkout);

    expect(events.find((e) => e.name === "flow.failed" && e.step === "charge")).toMatchObject({
      outcome: "error",
      http_status: 503,
      error_code: "operations_disabled",
    });
    expect(events.find((e) => e.name === "flow.failed" && e.step === "payment")).toMatchObject({ outcome: "error" });
  });

  it("reports the 3DS challenge when it is shown", () => {
    const telemetry = { threedsChallengeShown: jest.fn() } as any;
    const handler = new ThreeDSHandler({ telemetry, tdsIframeId: "tdsIframe", redirectOnComplete: false });
    handler.setPayload({ next_action: { redirect_to_url: { url: "https://acs.example.com/c", verify_transaction_status_url: "/v" } } });
    document.body.innerHTML = '<iframe id="tdsIframe"></iframe>';

    handler.redirectToChallenge();

    expect(telemetry.threedsChallengeShown).toHaveBeenCalledTimes(1);
  });
});
