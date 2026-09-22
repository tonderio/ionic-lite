import { LiteCheckout } from "../src/classes/liteCheckout";
import { AppError } from "../src/shared/utils/appError";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const VALID_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MDAwMDAwMDB9.Kx-3vQ0m9R1s2T4u6W8y";

function buildCheckout(): LiteCheckout {
  return new LiteCheckout({ mode: "stage", apiKey: "public-api-key" });
}

function configure(checkout: LiteCheckout, secureToken: unknown) {
  checkout.configureCheckout({
    customer: { email: "buyer@example.com" },
    secureToken,
  } as any);
}

describe("secure token trust boundary", () => {
  it("accepts a well-formed token", () => {
    const checkout = buildCheckout();

    configure(checkout, VALID_TOKEN);

    expect(checkout.secureToken).toBe(VALID_TOKEN);
  });

  it.each([
    ["a header-splitting value", "good-token\r\nX-Injected: 1"],
    ["an embedded newline", "good-token\ninjected"],
    ["surrounding whitespace", " good-token "],
    ["a null byte", "good-token\u0000"],
    ["a non-ASCII character", "good-tokén"],
    ["an empty string", ""],
    ["a missing value", undefined],
    ["a non-string value", { access: VALID_TOKEN }],
  ])("rejects %s", (_label, token) => {
    const checkout = buildCheckout();

    expect(() => configure(checkout, token)).toThrow(AppError);
    try {
      configure(checkout, token);
    } catch (error) {
      expect((error as AppError).code).toBe(ErrorKeyEnum.SECURE_TOKEN_INVALID);
    }
  });

  it("leaves the previously accepted token in place when a bad one is rejected", () => {
    const checkout = buildCheckout();
    configure(checkout, VALID_TOKEN);

    expect(() => configure(checkout, "poisoned\r\nX-Injected: 1")).toThrow(AppError);

    expect(checkout.secureToken).toBe(VALID_TOKEN);
  });

  it("never lets a rejected token reach the Authorization header", async () => {
    const checkout = buildCheckout();
    configure(checkout, VALID_TOKEN);

    try {
      configure(checkout, "poisoned\r\nX-Injected: 1");
    } catch {
      // Rejected at the boundary; the request below must still carry the good token.
    }

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user_id: 1, cards: [] }),
    });
    (global as any).fetch = fetchMock;

    await checkout._getCustomerCards("customer-token", 42);

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe(`Bearer ${VALID_TOKEN}`);
    expect(headers.Authorization).not.toContain("\r");
    expect(headers.Authorization).not.toContain("\n");
  });
});
