import { LiteCheckout } from "../src/classes/liteCheckout";

const STORAGE_KEY = "verify_transaction_status_url";
const VERIFY_PATH = "/api/v1/tonder/ksk/business/7/payments/55/transactions/9";

describe("3DS verify credential", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: VERIFY_PATH, expires: Date.now() + 60_000 }),
    );
    fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ status: "Success" }),
    });
    (global as any).fetch = fetchMock;
  });

  afterEach(() => localStorage.clear());

  it("uses apiKey when the merchant passes it", async () => {
    const checkout = new LiteCheckout({ mode: "stage", apiKey: "the-api-key" });

    await checkout.process3ds.verifyTransactionStatus();

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Token the-api-key");
  });

  it("uses the deprecated apiKeyTonder when it is the only key passed", async () => {
    const checkout = new LiteCheckout({
      mode: "stage",
      apiKeyTonder: "the-deprecated-key",
    } as any);

    await checkout.process3ds.verifyTransactionStatus();

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Token the-deprecated-key");
  });
});
