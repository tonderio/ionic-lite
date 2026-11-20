import { LiteCheckout } from "../src/classes/liteCheckout";
import { CardOnFile } from "../src/helpers/card_on_file";

const CORE = "https://api-stage.tonder.io";
const LEGACY = "https://stage.tonder.io";

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, clone() { return this; } };
}

function installFetch(flag: boolean) {
  (global as any).fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const route = `${init?.method ?? "GET"} ${url}`;
    switch (route) {
      case `GET ${CORE}/transactions/v1/business/config`:
        return reply(200, {
          business: { pk: 7 },
          core_payments_enabled: flag,
          cardonfile_keys: { public_key: "cof-public" },
        });
      case `POST ${CORE}/transactions/v1/customer`:
        return reply(201, { customer_id: 9, auth_token: "eyJ.core.jwt", first_name: "Ana", last_name: "", email: "ana@example.com", auth_token_expires_at: "2026-11-20T12:00:00Z" });
      case `POST ${LEGACY}/api/v1/customer/`:
        return reply(200, { id: 9, auth_token: "legacy-customer-token", first_name: "Ana", email: "ana@example.com" });
      case `POST ${CORE}/transactions/v1/cards`:
      case `POST ${LEGACY}/api/v1/business/7/cards/`:
        return reply(201, { id: "sf-2", customer_id: 9, subscription_id: null, card_bin: "411111" });
      default:
        throw new Error(`unexpected request ${route}`);
    }
  });
}

async function saveCardAndGetSubscriptionOwner(flag: boolean) {
  installFetch(flag);
  const checkout = new LiteCheckout({ mode: "stage", apiKey: "key" });
  checkout.configureCheckout({ customer: { email: "ana@example.com" }, secureToken: "secure" } as any);
  jest.spyOn(CardOnFile.prototype, "initialize").mockResolvedValue(undefined);
  jest.spyOn(CardOnFile.prototype, "getJwt").mockResolvedValue("jwt");
  jest.spyOn(CardOnFile.prototype, "generateToken").mockResolvedValue({ token: "tok", secureId: "sid", security: {} } as any);
  jest.spyOn(CardOnFile.prototype, "validate3DS").mockResolvedValue(true as any);
  const createSubscription = jest
    .spyOn(CardOnFile.prototype, "createSubscription")
    .mockResolvedValue({ subscriptionId: "sub-1" } as any);
  jest.spyOn(checkout as any, "collectCreateCardTokens").mockResolvedValue({
    skyflow_id: "sf-2",
    card_number: "t1",
    cvv: "t2",
    expiration_month: "t3",
    expiration_year: "t4",
    cardholder_name: "t5",
  });

  await checkout.saveCustomerCard();

  return (createSubscription.mock.calls[0][0] as any).metadata.customerId;
}

afterEach(() => jest.restoreAllMocks());

describe("Card On File subscription owner", () => {
  it("is the customer's id with the flag ON, never the core's token", async () => {
    expect(await saveCardAndGetSubscriptionOwner(true)).toBe("9");
  });

  it("is still the customer's token with the flag OFF", async () => {
    expect(await saveCardAndGetSubscriptionOwner(false)).toBe("legacy-customer-token");
  });
});
