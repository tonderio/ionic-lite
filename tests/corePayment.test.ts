import {
  buildCoreProcessBody,
  rebuildCheckoutResult,
  rebuildVerifyTransaction,
} from "../src/helpers/corePayment";
import type { CoreVerifyTransaction, ITransaction } from "../src/types/transaction";

const CORE_BASE = "https://api-stage.tonder.io";
const CTX = { coreBaseUrl: CORE_BASE };
const TRANSACTION_ID = "0192b8a0-0000-7000-8000-000000000001";

const ITEMS = [
  {
    name: "Shirt",
    description: "Blue",
    quantity: 2,
    price_unit: 50,
    discount: 0,
    taxes: 0,
    product_reference: "sku-1",
    amount_total: 100,
  },
];

const NEW_CARD = {
  card_number: "tok-number",
  cvv: "tok-cvv",
  expiration_month: "tok-month",
  expiration_year: "tok-year",
  cardholder_name: "tok-name",
  skyflow_id: "sf-1",
};

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    amount: 100,
    currency: "MXN",
    reference: "TNDR-1",
    customer: { firstName: "Ana", lastName: "Lopez", email: "ana@example.com", phone: "555" },
    card: NEW_CARD,
    metadata: { order_id: "o-1" },
    returnUrl: "https://shop.example.com/done",
    items: ITEMS,
    ...overrides,
  };
}

describe("buildCoreProcessBody", () => {
  it("maps a new card to the vault field tokens and sends the record id as skyflow_id, never as token", () => {
    const body = buildCoreProcessBody(baseInput());

    expect(body.payment_method).toEqual({
      type: "CARD",
      card_number: "tok-number",
      cvv: "tok-cvv",
      expiration_month: "tok-month",
      expiration_year: "tok-year",
      cardholder_name: "tok-name",
      skyflow_id: "sf-1",
    });
    expect(body.payment_method).not.toHaveProperty("token");
  });

  it("sends no skyflow_id for a new card whose record id is unknown", () => {
    const { skyflow_id, ...withoutId } = NEW_CARD;
    expect(buildCoreProcessBody(baseInput({ card: withoutId })).payment_method).not.toHaveProperty("skyflow_id");
  });

  it("maps a saved card to its vault record id as the token", () => {
    const body = buildCoreProcessBody(baseInput({ card: { skyflow_id: "sf-9" } }));

    expect(body.payment_method).toEqual({ type: "CARD", token: "sf-9" });
    expect(body.payment_method).not.toHaveProperty("skyflow_id");
  });

  it("sends the payment the way the legacy flow described it", () => {
    const body = buildCoreProcessBody(baseInput());

    expect(body).toMatchObject({
      operation_type: "payment",
      amount: 100,
      currency: "MXN",
      client_reference: "TNDR-1",
      customer: { name: "Ana Lopez", email: "ana@example.com" },
      metadata: { order_id: "o-1" },
      return_url: "https://shop.example.com/done",
      items: ITEMS,
    });
  });

  it("takes the customer name from the deprecated name and lastname fields too", () => {
    const body = buildCoreProcessBody(
      baseInput({ customer: { name: "Ana", lastname: "Lopez", email: "a@example.com" } }),
    );

    expect(body.customer).toEqual({ name: "Ana Lopez", email: "a@example.com" });
  });

  it("leaves out what the merchant did not send", () => {
    const body = buildCoreProcessBody(
      baseInput({ currency: undefined, metadata: undefined, items: undefined, returnUrl: undefined }),
    );
    const sent = JSON.parse(JSON.stringify(body));

    expect(sent).not.toHaveProperty("currency");
    expect(sent).not.toHaveProperty("metadata");
    expect(sent).not.toHaveProperty("items");
    expect(sent).not.toHaveProperty("return_url");
  });

  it("never sends the legacy order, payment or checkout anchors", () => {
    const sent = JSON.parse(JSON.stringify(buildCoreProcessBody(baseInput())));

    for (const key of ["order_id", "payment_id", "checkout_id", "business_id", "routing"]) {
      expect(sent).not.toHaveProperty(key);
    }
  });
});

const SUCCESS = {
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

const VERIFY_ACTION = {
  name: "verify_transaction_status",
  url: `${CORE_BASE}/transactions/v1/${TRANSACTION_ID}`,
  method: "GET",
};

describe("rebuildCheckoutResult", () => {
  it("points the verify action of a core payment at the core's GET by transaction id", () => {
    const { actions } = rebuildCheckoutResult(201, SUCCESS, CTX).body;

    expect(actions[0]).toEqual({
      name: "verify_transaction_status",
      url: `${CORE_BASE}/transactions/v1/${TRANSACTION_ID}`,
      method: "GET",
    });
  });

  it("rebuilds the checkout-router body of an approved payment", () => {
    const result = rebuildCheckoutResult(201, SUCCESS, CTX);

    expect(result.outcome).toBe("resolve");
    expect(result.body).toEqual({
      status: "200",
      message: "Success",
      checkout_id: "chk-1",
      is_route_finished: true,
      transaction_status: "Success",
      transaction_id: 9,
      payment_id: 55,
      provider: "tonder",
      next_action: SUCCESS.next_action,
      psp_response: { id: "psp-1" },
      actions: [
        VERIFY_ACTION,
        {
          name: "refund_transaction",
          url: `${CORE_BASE}/transactions/v1/process`,
          method: "POST",
          body: { operation_type: "refund", original_transaction_id: TRANSACTION_ID },
        },
      ],
    });
  });

  it("reports the core's status as transaction_status, never the rail's", () => {
    const open = rebuildCheckoutResult(
      201,
      { ...SUCCESS, status: "Processing", transaction_status: "Declined" },
      CTX,
    );
    const declined = rebuildCheckoutResult(
      200,
      { ...SUCCESS, status: "Declined", decline_code: "05", transaction_status: "Pending" },
      CTX,
    );

    expect(open.body.transaction_status).toBe("Processing");
    expect(declined.body.transaction_status).toBe("Declined");
  });

  it("keeps the 3DS redirect of a pending payment and its verify URL", () => {
    const redirect = {
      redirect_to_url: {
        url: "https://payflow.example.com/process?token=t#session=s",
        return_url: "https://shop.example.com/done",
        verify_transaction_status_url: `/transactions/v1/${TRANSACTION_ID}`,
      },
    };

    const result = rebuildCheckoutResult(
      201,
      { ...SUCCESS, status: "Pending", transaction_status: "Pending", next_action: redirect,
        routing: { checkout_id: "chk-1", is_route_finished: false } },
      CTX,
    );

    expect(result.outcome).toBe("resolve");
    expect(result.body.transaction_status).toBe("Pending");
    expect(result.body.is_route_finished).toBe(false);
    expect(result.body.next_action).toEqual(redirect);
  });

  const DECLINE = {
    ...SUCCESS,
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
      rejected_psp_responses: [{ id: "r1" }, { id: "r2" }],
    },
  };

  it("rejects a declined payment with the 404 body the router answered", () => {
    const result = rebuildCheckoutResult(200, DECLINE, CTX);

    expect(result.outcome).toBe("reject");
    expect(result.status).toBe(404);
    expect(result.body).toEqual({
      status: "404",
      message: "Do not honor",
      checkout_id: "chk-1",
      is_route_finished: true,
      transaction_status: "Declined",
      transaction_id: 9,
      payment_id: 55,
      provider: "tonder",
      decline_code: "05",
      psp_response: [{ id: "r1" }, { id: "r2" }],
      actions: [
        VERIFY_ACTION,
        {
          name: "refund_transaction",
          url: `${CORE_BASE}/transactions/v1/process`,
          method: "POST",
          body: { operation_type: "refund", original_transaction_id: TRANSACTION_ID },
        },
      ],
    });
  });

  it("answers a hard decline with its own message and the single rail response", () => {
    const result = rebuildCheckoutResult(
      200,
      {
        ...DECLINE,
        routing: {
          ...DECLINE.routing,
          decline_type: "Hard",
          rejected_psp_responses: [{ id: "r1" }, { id: "hard" }],
        },
      },
      CTX,
    );

    expect(result.status).toBe(404);
    expect(result.body.message).toBe("Hard decline");
    expect(result.body.psp_response).toEqual({ id: "hard" });
  });

  it("answers a failed payment like a declined one", () => {
    const result = rebuildCheckoutResult(
      200,
      { ...DECLINE, status: "Failed", transaction_status: "Failed" },
      CTX,
    );

    expect(result.outcome).toBe("reject");
    expect(result.body.transaction_status).toBe("Failed");
  });

  it("resolves a Guardian block with a 200 body, as the router answered it", () => {
    const result = rebuildCheckoutResult(
      200,
      {
        ...DECLINE,
        decline_code: "FH01",
        decline_reason: "High risk transaction blocked",
        transaction_id: "guardian-row-1",
        psp_response: { guardian: true },
        routing: { checkout_id: "chk-1", is_route_finished: true },
      },
      CTX,
    );

    expect(result.outcome).toBe("resolve");
    expect(result.body).toEqual({
      status: "200",
      message: "High risk transaction blocked",
      checkout_id: "chk-1",
      transaction_status: "Declined",
      transaction_id: "guardian-row-1",
      payment_id: 55,
      provider: "tonder",
      amount: 100,
      currency: "MXN",
      psp_response: { guardian: true },
      decline_code: "FH01",
    });
  });

  it("sends the Guardian block's amount as a JSON number, 0 when it is missing, as the router did", () => {
    const blocked = { ...DECLINE, decline_code: "FH01", routing: { checkout_id: "chk-1", is_route_finished: true } };

    expect(rebuildCheckoutResult(200, { ...blocked, amount: "100.0000" }, CTX).body.amount).toBe(100);
    expect(rebuildCheckoutResult(200, { ...blocked, amount: undefined }, CTX).body.amount).toBe(0);
    expect(rebuildCheckoutResult(200, { ...blocked, amount: "0.0000" }, CTX).body.amount).toBe(0);
  });

  it.each(["Success", "Authorized", "Pending", "Processing"])(
    "resolves a '%s' payment",
    (status) => {
      expect(rebuildCheckoutResult(201, { ...SUCCESS, status }, CTX).outcome).toBe("resolve");
    },
  );

  it.each(["Cancelled", "Canceled", "Expired", "Voided", "Returned", "Error", "SomethingNew", ""])(
    "never treats a '%s' status as approved",
    (status) => {
      const result = rebuildCheckoutResult(201, { ...SUCCESS, status }, CTX);

      expect(result.outcome).toBe("reject");
      expect(result.status).toBe(404);
      expect(result.body.status).toBe("404");
      expect(result.body.message).not.toBe("Success");
      expect(result.body.transaction_status).toBe(status);
    },
  );

  it("never treats an answer without a status as approved", () => {
    expect(rebuildCheckoutResult(201, { id: "x" }, CTX).outcome).toBe("reject");
  });

  it.each(["Cancelled", "Expired", "SomethingNew", "Failed"])(
    "does not take the Guardian shape for a '%s' payment carrying the Guardian code",
    (status) => {
      const result = rebuildCheckoutResult(
        200,
        { ...SUCCESS, status, decline_code: "FH01", decline_reason: "blocked" },
        CTX,
      );

      expect(result.outcome).toBe("reject");
      expect(result.body.status).toBe("404");
      expect(result.body.transaction_status).toBe(status);
    },
  );

  it("rebuilds every refusal of the core in one place, keeping the status text", () => {
    const result = rebuildCheckoutResult(
      409,
      { error: { code: "conflict", message: "busy", type: "conflict" }, request_id: "r-1" },
      CTX,
      "Conflict",
    );

    expect(result).toEqual({
      outcome: "reject",
      status: 409,
      statusText: "Conflict",
      body: { status: "409", message: "busy", psp_response: [], is_route_finished: false },
    });
  });

  it("rebuilds a 402 other than a declined payment as a refusal, not as an ended route", () => {
    const result = rebuildCheckoutResult(
      402,
      { error: { code: "payment_required", message: "pay", type: "business_error" } },
      CTX,
    );

    expect(result.status).toBe(402);
    expect(result.body.is_route_finished).toBe(false);
  });

  it("rejects the normalized 402 of a route that ended with no transaction", () => {
    const result = rebuildCheckoutResult(
      402,
      { error: { code: "payment_declined", message: "declined", type: "business_error" } },
      CTX,
    );

    expect(result.outcome).toBe("reject");
    expect(result.status).toBe(404);
    expect(result.body).toEqual({
      status: "404",
      message: "Error",
      psp_response: [],
      is_route_finished: true,
    });
  });
});

describe("rebuildVerifyTransaction", () => {
  it("is typed as the reduced object, which is not an ITransaction", () => {
    const verified: CoreVerifyTransaction = rebuildVerifyTransaction({
      id: TRANSACTION_ID,
      status: "Success",
    });
    // @ts-expect-error country, payment_method and the fees are absent, so it is not a full ITransaction
    const full: ITransaction = verified;
    expect(full).toBeDefined();
  });

  const CORE_GET = {
    id: TRANSACTION_ID,
    operation_type: "payment",
    status: "Success",
    amount: "100.0000",
    currency: "MXN",
    created_at: "2026-11-18T10:00:00Z",
    updated_at: "2026-11-18T10:00:05Z",
    client_reference: "order-1",
    metadata: { order: "1" },
    provider: "tonder",
    payment_method_type: "CARD",
    payment_id: 5001,
    transaction_id: "881",
    acq: "kushki",
    transaction_status: "Success",
    psp_response: { code: "000" },
    routing: {
      checkout_id: "0198f3a2-7c1e-7b3a-9d2e-5f1a2b3c4d5e",
      is_route_finished: true,
      decline_type: null,
      rejected_psp_responses: [],
    },
  };

  it("builds the monolith transaction object from the core answer for a Success", () => {
    expect(rebuildVerifyTransaction(CORE_GET)).toEqual({
      id: 881,
      status: "Success",
      transaction_status: "Success",
      provider: "tonder",
      amount: "100.0000",
      currency: { code: "MXN" },
      currency_code: "MXN",
      created: "2026-11-18T10:00:00Z",
      modified: "2026-11-18T10:00:05Z",
      metadata: { order: "1" },
      is_apm: false,
      transaction_type: "PAYMENT",
      payment: { id: 5001 },
      checkout: { id: "0198f3a2-7c1e-7b3a-9d2e-5f1a2b3c4d5e", is_route_finished: true },
      checkout_id: "0198f3a2-7c1e-7b3a-9d2e-5f1a2b3c4d5e",
      response: { code: "000" },
    });
  });

  it("keeps the core status as both status and transaction_status for a Declined payment", () => {
    const result = rebuildVerifyTransaction({
      ...CORE_GET,
      status: "Declined",
      transaction_status: "Declined",
      decline_code: "GS01",
      decline_reason: "Declined",
    });
    expect(result).toMatchObject({ status: "Declined", transaction_status: "Declined", id: 881 });
    expect(result).not.toHaveProperty("next_action");
    expect(result).not.toHaveProperty("actions");
    expect(result).not.toHaveProperty("is_route_finished");
  });

  it("uses the core's own status for a Pending payment, not the attempt's result", () => {
    const result = rebuildVerifyTransaction({
      ...CORE_GET,
      status: "Pending",
      transaction_status: "Success",
      next_action: { redirect_to_url: { url: "https://payflow.example.com/process" } },
    });
    expect(result).toMatchObject({ status: "Pending", transaction_status: "Pending" });
    expect(result).not.toHaveProperty("next_action");
  });

  it("maps the core's first-party transaction fields 1:1, keeping a null as null", () => {
    const result = rebuildVerifyTransaction({
      ...CORE_GET,
      card_brand: "VISA",
      transaction_reference: "ref-1",
      number_of_payment_attempts: 2,
      number_of_installments: 1,
      three_d_secure: { eci: "05" },
      reason: null,
      operation_date: "2026-11-18T10:00:02Z",
      decline: null,
    } as any);
    expect(result).toMatchObject({
      card_brand: "VISA",
      transaction_reference: "ref-1",
      number_of_payment_attempts: 2,
      number_of_installments: 1,
      three_d_secure: { eci: "05" },
      operation_date: "2026-11-18T10:00:02Z",
    });
    expect(result.reason).toBeNull();
    expect(result.decline).toBeNull();
    expect(rebuildVerifyTransaction({ ...CORE_GET, decline: { code: "05" } } as any).decline).toEqual({ code: "05" });
  });

  it("keeps a null the core answers as null and omits only the keys it lacks", () => {
    const result = rebuildVerifyTransaction({
      id: TRANSACTION_ID,
      operation_type: "payment",
      status: "Failed",
      metadata: null,
      psp_response: null,
      transaction_id: null,
      payment_id: null,
      routing: { checkout_id: null, is_route_finished: true },
    } as any);
    expect(result).toMatchObject({
      metadata: null,
      response: null,
      id: null,
      payment: null,
      checkout: null,
      checkout_id: null,
    });
    const lacking = rebuildVerifyTransaction({ id: TRANSACTION_ID, status: "Failed" });
    for (const key of ["metadata", "response", "id", "payment", "checkout", "checkout_id"]) {
      expect(lacking).not.toHaveProperty(key);
    }
  });

  it("keeps a null currency, amount and dates null and leaves absent ones absent", () => {
    const nulls = rebuildVerifyTransaction({
      id: TRANSACTION_ID,
      status: "Failed",
      currency: null,
      amount: null,
      created_at: null,
      updated_at: null,
    } as any);
    expect(nulls).toMatchObject({
      currency: null,
      currency_code: null,
      amount: null,
      created: null,
      modified: null,
    });

    const absent = rebuildVerifyTransaction({ id: TRANSACTION_ID, status: "Failed" });
    for (const key of ["currency", "currency_code", "amount", "created", "modified"]) {
      expect(absent).not.toHaveProperty(key);
    }
    expect(absent).toMatchObject({ status: "Failed", transaction_status: "Failed", provider: "tonder", is_apm: false });
  });

  it("defaults provider to tonder and maps a refund's operation_type", () => {
    const result = rebuildVerifyTransaction({ ...CORE_GET, provider: undefined, operation_type: "refund" });
    expect(result).toMatchObject({ provider: "tonder", transaction_type: "REFUND" });
    expect(result).not.toHaveProperty("operation_date");
    expect(rebuildVerifyTransaction({ ...CORE_GET, operation_type: "withdrawal" })).not.toHaveProperty("transaction_type");
  });

  it("leaves out what the core does not hold instead of inventing it", () => {
    const result = rebuildVerifyTransaction({
      id: TRANSACTION_ID,
      operation_type: "payment",
      status: "Failed",
      amount: "5.0000",
      currency: "MXN",
      created_at: "2026-11-18T10:00:00Z",
      updated_at: "2026-11-18T10:00:00Z",
    });
    expect(Object.keys(result).sort()).toEqual(
      [
        "amount",
        "created",
        "currency",
        "currency_code",
        "is_apm",
        "modified",
        "provider",
        "status",
        "transaction_status",
        "transaction_type",
      ].sort(),
    );
    for (const absent of ["fee_amount", "guardian_status", "wallet", "card_brand", "payment", "checkout", "id"]) {
      expect(result).not.toHaveProperty(absent);
    }
  });
});
