import { get } from "./get";
import { IItem } from "../types/checkout";
import { ICoreTransactionResponse } from "../types/core";

const GUARDIAN_DECLINE_CODE = "FH01";

const CARD_FIELDS = [
  "card_number",
  "cvv",
  "expiration_month",
  "expiration_year",
  "cardholder_name",
] as const;

export type CoreCheckoutInput = {
  amount: number;
  currency?: string;
  reference: string | number;
  customer: Record<string, any> | undefined;
  /** The vault field tokens of a new card, or `{ skyflow_id }` for a saved one. */
  card: Record<string, any>;
  metadata?: Record<string, any>;
  returnUrl?: string;
  items?: IItem[];
  browserInfo?: Record<string, any>;
};

export type CoreResultContext = { coreBaseUrl: string };

export type RebuiltResult = {
  outcome: "resolve" | "reject";
  /** The HTTP status `checkout-router` answered with. */
  status: number;
  body: Record<string, any>;
};

export function newRequestId(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") return webCrypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** The `/process` body Direct API takes, from what the legacy flow put in orders, payments and checkout-router. */
export function buildCoreProcessBody(input: CoreCheckoutInput) {
  const { card, customer } = input;
  const name = [
    get(customer, "firstName", get(customer, "name", "")),
    get(customer, "lastName", get(customer, "lastname", "")),
  ]
    .filter(Boolean)
    .join(" ");

  const paymentMethod = card.card_number
    ? {
        type: "CARD",
        ...Object.fromEntries(CARD_FIELDS.map((field) => [field, card[field]])),
      }
    : { type: "CARD", token: card.skyflow_id };

  return {
    operation_type: "payment",
    amount: input.amount,
    currency: input.currency,
    client_reference: String(input.reference),
    customer: {
      name,
      email: get(customer, "email", ""),
      phone: get(customer, "phone", undefined),
      identification: get(customer, "identification", undefined),
    },
    payment_method: paymentMethod,
    metadata: input.metadata,
    return_url: input.returnUrl,
    items: input.items,
    browser_info: input.browserInfo,
  };
}

function legacyId(id: string | undefined): string | number | undefined {
  return id !== undefined && /^\d+$/.test(id) ? Number(id) : id;
}

// A core payment is verified and refunded through the core, by the payment's public id.
function buildActions(transaction: ICoreTransactionResponse, ctx: CoreResultContext) {
  return [
    {
      name: "verify_transaction_status",
      url: `${ctx.coreBaseUrl}/transactions/v1/${transaction.id}`,
      method: "GET",
    },
    {
      name: "refund_transaction",
      url: `${ctx.coreBaseUrl}/transactions/v1/process`,
      method: "POST",
      body: { operation_type: "refund", original_transaction_id: transaction.id },
    },
  ];
}

function declinedBody(transaction: ICoreTransactionResponse, ctx: CoreResultContext) {
  const routing = transaction.routing;
  const rejected = routing?.rejected_psp_responses ?? [];
  const hard = routing?.decline_type === "Hard";
  return {
    status: "404",
    message: hard ? "Hard decline" : transaction.decline_reason ?? "Transaction declined",
    checkout_id: routing?.checkout_id,
    is_route_finished: routing?.is_route_finished,
    transaction_status: transaction.status,
    transaction_id: legacyId(transaction.transaction_id),
    payment_id: transaction.payment_id,
    provider: transaction.provider,
    decline_code: transaction.decline_code,
    psp_response: hard ? rejected[rejected.length - 1] : rejected,
    actions: buildActions(transaction, ctx),
  };
}

function guardianBody(transaction: ICoreTransactionResponse) {
  return {
    status: "200",
    message: transaction.decline_reason ?? "High risk transaction blocked",
    checkout_id: transaction.routing?.checkout_id,
    transaction_status: "Declined",
    transaction_id: transaction.transaction_id,
    payment_id: transaction.payment_id,
    provider: transaction.provider,
    amount: transaction.amount,
    currency: transaction.currency,
    psp_response: transaction.psp_response,
    decline_code: transaction.decline_code,
  };
}

function approvedBody(transaction: ICoreTransactionResponse, ctx: CoreResultContext) {
  return {
    status: "200",
    message: "Success",
    checkout_id: transaction.routing?.checkout_id,
    is_route_finished: transaction.routing?.is_route_finished,
    transaction_status: transaction.status,
    transaction_id: legacyId(transaction.transaction_id),
    payment_id: transaction.payment_id,
    provider: transaction.provider,
    next_action: transaction.next_action ?? {},
    psp_response: transaction.psp_response,
    actions: buildActions(transaction, ctx),
  };
}

/**
 * Rebuilds what `checkout-router` answered for the same payment, from the core's answer:
 * a body to resolve `payment()` with, or the 4xx body it rejected with.
 */
export function rebuildCheckoutResult(
  httpStatus: number,
  body: any,
  ctx: CoreResultContext,
): RebuiltResult {
  if (httpStatus === 402) {
    return {
      outcome: "reject",
      status: 404,
      body: { status: "404", message: "Error", psp_response: [], is_route_finished: true },
    };
  }

  const transaction = body as ICoreTransactionResponse;
  if (transaction.status !== "Declined" && transaction.status !== "Failed") {
    return { outcome: "resolve", status: 200, body: approvedBody(transaction, ctx) };
  }
  if (transaction.decline_code === GUARDIAN_DECLINE_CODE) {
    return { outcome: "resolve", status: 200, body: guardianBody(transaction) };
  }
  return { outcome: "reject", status: 404, body: declinedBody(transaction, ctx) };
}
