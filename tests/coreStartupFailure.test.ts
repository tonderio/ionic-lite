import { LiteCheckout } from "../src/classes/liteCheckout";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const CORE = "https://api-stage.tonder.io";

function answer(status: number, body: () => Promise<unknown>) {
  return { ok: status < 400, status, json: body, clone() { return this; } };
}

const FAILURES: [string, () => Promise<unknown>][] = [
  ["a 403", async () => answer(403, async () => ({ error: { code: "forbidden" } }))],
  ["a 401", async () => answer(401, async () => ({}))],
  ["a 503", async () => answer(503, async () => ({}))],
  ["a network error", async () => { throw new TypeError("Failed to fetch"); }],
  ["a body that is not JSON", async () => answer(200, async () => { throw new SyntaxError("Unexpected token <"); })],
];

describe("start-up when the business configuration cannot be read", () => {
  let fetchMock: jest.Mock;

  function failWith(reply: () => Promise<unknown>) {
    fetchMock = jest.fn(async (url: string) => {
      if (url === `${CORE}/transactions/v1/business/config`) return reply();
      throw new Error(`unexpected request to ${url}`);
    });
    (global as any).fetch = fetchMock;
  }

  it.each(FAILURES)("injectCheckout rejects with a clear error after %s", async (_label, reply) => {
    failWith(reply);
    const checkout = new LiteCheckout({ mode: "stage", apiKey: "key" });

    await expect(checkout.injectCheckout()).rejects.toMatchObject({
      code: ErrorKeyEnum.FETCH_BUSINESS_ERROR,
    });
  });

  it.each(FAILURES)("mountCardFields rejects with a clear error after %s", async (_label, reply) => {
    failWith(reply);
    const checkout = new LiteCheckout({ mode: "stage", apiKey: "key" });

    await expect(checkout.mountCardFields({ fields: ["card_number"] } as any)).rejects.toMatchObject({
      code: ErrorKeyEnum.FETCH_BUSINESS_ERROR,
    });
  });

  it("never falls back to the legacy business configuration", async () => {
    failWith(FAILURES[0][1]);
    const checkout = new LiteCheckout({ mode: "stage", apiKey: "key" });

    await checkout.injectCheckout().catch(() => {});

    const urls = fetchMock.mock.calls.map(([url]) => url as string);
    expect(urls).toContain(`${CORE}/transactions/v1/business/config`);
    expect(urls.filter((url) => url.includes("/payments/business/"))).toEqual([]);
    expect(urls.filter((url) => new URL(url).host === "stage.tonder.io")).toEqual([]);
  });

  it("asks again on the next call instead of caching the failure", async () => {
    failWith(FAILURES[2][1]);
    const checkout = new LiteCheckout({ mode: "stage", apiKey: "key" });
    await checkout.injectCheckout().catch(() => {});

    failWith(async () =>
      answer(200, async () => ({ business: { pk: 7 }, openpay_keys: {}, vault_id: "v", vault_url: "u" })),
    );

    await expect(checkout.injectCheckout()).resolves.toBeUndefined();
  });
});
