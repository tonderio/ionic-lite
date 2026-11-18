import { LiteCheckout } from "../src/classes/liteCheckout";
import { fetchBusiness } from "../src/data/businessApi";
import { AppError } from "../src/shared/utils/appError";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const API_KEY = "merchant-api-key";
const CORE_STAGE = "https://api-stage.tonder.io";
const CORE_PRODUCTION = "https://api.tonder.io";

const CONFIG_BODY = {
  business: { pk: 7, name: "Shop" },
  openpay_keys: { merchant_id: "", public_key: "" },
  vault_id: "vault",
  vault_url: "https://vault.example.com",
  reference: "TNDR-1",
  core_payments_enabled: true,
};

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe("business configuration read from the core", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(okJson(CONFIG_BODY));
    (global as any).fetch = fetchMock;
  });

  it("calls the core's business config route with the API key in the header only", async () => {
    const signal = new AbortController().signal;

    const business = await fetchBusiness(CORE_STAGE, API_KEY, signal);

    expect(business).toEqual(CONFIG_BODY);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${CORE_STAGE}/transactions/v1/business/config`);
    expect(url).not.toContain(API_KEY);
    expect(init.method ?? "GET").toBe("GET");
    expect(init.headers.Authorization).toBe(`Token ${API_KEY}`);
    expect(init.signal).toBe(signal);
  });

  it("rejects instead of handing an error body over as the configuration", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      clone() {
        return this;
      },
      json: async () => ({ error: { code: "business_not_active" } }),
    });

    await expect(
      fetchBusiness(CORE_STAGE, API_KEY, new AbortController().signal),
    ).rejects.toMatchObject({
      code: ErrorKeyEnum.FETCH_BUSINESS_ERROR,
      statusCode: 403,
    });
  });

  it.each([
    ["stage", CORE_STAGE],
    ["production", CORE_PRODUCTION],
  ] as const)("LiteCheckout starts up against the %s core", async (mode, base) => {
    const checkout = new LiteCheckout({ mode, apiKey: API_KEY });

    const merchant = await checkout._fetchMerchantData();

    expect(merchant).toEqual(CONFIG_BODY);
    expect(fetchMock.mock.calls[0][0]).toBe(`${base}/transactions/v1/business/config`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("getBusiness() answers the configuration of the core", async () => {
    const checkout = new LiteCheckout({ mode: "stage", apiKey: API_KEY });

    await expect(checkout.getBusiness()).resolves.toEqual(CONFIG_BODY);
    expect(fetchMock.mock.calls[0][0]).toBe(`${CORE_STAGE}/transactions/v1/business/config`);
  });

  it("getBusiness() keeps its public error code when the core refuses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      clone() {
        return this;
      },
      json: async () => ({}),
    });
    const checkout = new LiteCheckout({ mode: "stage", apiKey: API_KEY });

    const failure = await checkout.getBusiness().catch((e) => e);

    expect(failure).toBeInstanceOf(AppError);
    expect(failure.code).toBe(ErrorKeyEnum.FETCH_BUSINESS_ERROR);
  });
});
