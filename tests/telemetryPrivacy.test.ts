import { LiteCheckout } from "../src/classes/liteCheckout";

const CORE = "https://api-stage.tonder.io";
const TELEMETRY = `${CORE}/telemetry/v1/events`;
const EMAIL = "ana@example.com";

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

function installFetch(): jest.Mock {
  const mock = jest.fn(async (url: string) => {
    if (url === `${CORE}/transactions/v1/business/config`) return reply(200, CONFIG);
    if (url === `${CORE}/transactions/v1/customer`) {
      return reply(201, { customer_id: 4321, email: EMAIL, first_name: "Ana", last_name: "", auth_token: "tok", auth_token_expires_at: "2026-11-20T12:00:00Z" });
    }
    if (url === `${CORE}/transactions/v1/process`) {
      return reply(500, { error: { code: "internal_error", message: `failed for ${EMAIL}`, type: "service_error" } });
    }
    if (url === TELEMETRY) return reply(202, {});
    throw new Error(`unexpected request to ${url}`);
  });
  (global as any).fetch = mock;
  return mock;
}

function keysDeep(value: unknown, found: string[] = []): string[] {
  if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      found.push(key);
      keysDeep(inner, found);
    }
  }
  return found;
}

describe("SDK telemetry carries no buyer data", () => {
  it("sends none of the raw error, the page URL, the payment request and response or the customer id", async () => {
    const mock = installFetch();
    const checkout = new LiteCheckout({
      mode: "stage",
      apiKey: "merchant-api-key",
      returnUrl: "https://shop.example.com/done",
      callBack: jest.fn(),
    });
    await checkout.injectCheckout();

    await expect(
      checkout.payment({
        customer: { firstName: "Ana", lastName: "Lopez", email: EMAIL, phone: "555" },
        cart: { total: 100, items: [] },
        currency: "MXN",
        metadata: { order_id: "o-1" },
        card: "sf-saved",
      } as any),
    ).rejects.toMatchObject({ statusCode: 500 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const sent = mock.mock.calls.filter(([url]) => url === TELEMETRY);
    expect(sent.length).toBeGreaterThan(0);
    for (const [, init] of sent) {
      const event = JSON.parse(init.body);
      expect(keysDeep(event)).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^(user_id|url|error|request|response|payment|stack)$/)]),
      );
      expect(init.body).not.toContain(EMAIL);
      expect(init.body).not.toContain("sf-saved");
      expect(init.body).not.toContain("https://localhost/");
      expect(init.body).not.toContain("4321");
    }
  });
});
