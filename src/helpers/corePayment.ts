import { get } from "./get";
import { isApmTypeAnswer } from "./utils";
import { IItem } from "../types/checkout";
import { ICoreTransactionResponse } from "../types/core";
import { CoreVerifyTransaction } from "../types/transaction";

const GUARDIAN_DECLINE_CODE = "FH01";

const RESOLVED_STATUSES = ["Success", "Authorized", "Pending", "Processing"];

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
  /** The vault field tokens of a new card, or `{ skyflow_id }` for a saved one; none for an APM. */
  card?: Record<string, any>;
  /** The APM code as the merchant wrote it; the payment is a card payment without it. */
  paymentMethodType?: string;
  apmConfig?: Record<string, any>;
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
  statusText?: string;
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

  // The core's SPEI method is {type: "SPEI"} and nothing else: upper case, no apm_config.
  const paymentMethod = input.paymentMethodType?.toUpperCase() === "SPEI"
    ? { type: "SPEI" }
    : input.paymentMethodType
    ? {
        type: input.paymentMethodType,
        ...(input.apmConfig && Object.keys(input.apmConfig).length > 0
          ? { apm_config: input.apmConfig }
          : {}),
      }
    : card!.card_number
    ? {
        type: "CARD",
        ...Object.fromEntries(CARD_FIELDS.map((field) => [field, card![field]])),
        // Only the core's BIN lookup reads it; the field tokens carry the payment.
        ...(card!.skyflow_id ? { skyflow_id: card!.skyflow_id } : {}),
      }
    : { type: "CARD", token: card!.skyflow_id };

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

// A core payment is verified and refunded through the core, by the id the core answers: the
// transaction's (one per attempt with a method), not the payment's, which payment_id names.
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
    amount: Number(transaction.amount) || 0,
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
    ...Object.fromEntries(
      SPEI_TRANSACTION_FIELDS.filter((field) => transaction[field] != null).map((field) => [field, transaction[field]]),
    ),
    actions: buildActions(transaction, ctx),
  };
}

// A SPEI payment's CLABE and bank travel at the top level of the body, as the legacy flow returns them.
const SPEI_TRANSACTION_FIELDS = ["clabe", "bank_name"] as const;

// What the core answers with the monolith's own names and values: a key it holds is copied
// as given, a null included, because the monolith returns null there too.
const FIRST_PARTY_TRANSACTION_FIELDS = [
  "card_brand",
  "transaction_reference",
  "number_of_payment_attempts",
  "number_of_installments",
  "three_d_secure",
  "reason",
  "operation_date",
  "decline",
] as const;

const nullable = <T, R>(value: T | null | undefined, map: (value: T) => R): R | null | undefined =>
  value == null ? (value as null | undefined) : map(value);

const TRANSACTION_TYPES: Record<string, string> = { payment: "PAYMENT", refund: "REFUND" };

/**
 * Rebuilds the transaction object the monolith's verify answered, from the core's
 * `GET /transactions/v1/{id}` answer. Only the fields the core holds are set, with the monolith's
 * names, types and values; fees, rates, guardian_*, wallet, card data and the like are absent,
 * never invented. `status` and `transaction_status` both hold the payment's own status; `is_apm` is read from the method type the core answers.
 */
export function rebuildVerifyTransaction(transaction: ICoreTransactionResponse): CoreVerifyTransaction {
  const routing = transaction.routing;
  const checkoutId = routing?.checkout_id;
  // A key the core answers is mapped as it is, a null included (the monolith returns the stored
  // null); a key it lacks stays absent.
  const optional: Record<string, any> = {
    id: nullable(transaction.transaction_id, legacyId),
    metadata: transaction.metadata,
    response: transaction.psp_response,
    payment: nullable(transaction.payment_id, (id) => ({ id })),
    checkout: nullable(checkoutId, (id) => ({ id, is_route_finished: routing?.is_route_finished })),
    checkout_id: checkoutId,
    transaction_type: TRANSACTION_TYPES[transaction.operation_type ?? ""],
    amount: transaction.amount,
    currency: nullable(transaction.currency, (code) => ({ code })),
    currency_code: transaction.currency,
    created: transaction.created_at,
    modified: transaction.updated_at,
  };
  const verified: CoreVerifyTransaction = {
    status: transaction.status,
    transaction_status: transaction.status,
    provider: transaction.provider || "tonder",
    is_apm: isApmTypeAnswer(transaction.payment_method_type),
    ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
    ...Object.fromEntries(
      FIRST_PARTY_TRANSACTION_FIELDS.filter((field) => field in transaction).map((field) => [
        field,
        (transaction as Record<string, any>)[field],
      ]),
    ),
  };
  if (!isSpeiAnswer(transaction)) return verified;
  const spei = { ...verified, ...speiVerifyFields(transaction) };
  // A date the core does not answer stays absent, as on every other rail.
  if (transaction.operation_date === undefined) delete spei.operation_date;
  return spei;
}

const isSpeiAnswer = (transaction: ICoreTransactionResponse) =>
  transaction.payment_method_type?.toUpperCase() === "SPEI";

// The deposits service answers a SPEI verification in its own shapes: the amount as a number, the
// reference as text ("" when it has none) and the date as Python's UTC isoformat, with microseconds
// only when they are not zero.
const ISO_UTC = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?(?:Z|[+-]00:?00)?$/;

function toPythonIsoformat(value: string) {
  const match = typeof value === "string" ? ISO_UTC.exec(value) : null;
  if (!match) return value;
  const micros = (match[2] || "").slice(0, 6).padEnd(6, "0");
  return `${match[1]}${/^0+$/.test(micros) ? "" : `.${micros}`}+00:00`;
}

function speiVerifyFields(transaction: ICoreTransactionResponse) {
  const { amount, operation_date } = transaction;
  return {
    ...(amount !== undefined && Number.isFinite(Number(amount)) ? { amount: Number(amount) } : {}),
    transaction_reference: transaction.transaction_reference ?? "",
    ...(operation_date === undefined ? {} : { operation_date: toPythonIsoformat(operation_date) }),
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
  statusText?: string,
): RebuiltResult {
  if (httpStatus === 402 && body?.error?.code === "payment_declined") {
    return {
      outcome: "reject",
      status: 404,
      body: { status: "404", message: "Error", psp_response: [], is_route_finished: true },
    };
  }
  // Every other refusal of the core, in the shape and with the status text checkout-router used.
  if (httpStatus >= 400) {
    return {
      outcome: "reject",
      status: httpStatus,
      statusText,
      body: buildCheckoutRouterErrorBody(httpStatus, body),
    };
  }

  const transaction = body as ICoreTransactionResponse;
  // Only a status the SDK knows to be good resolves; Declined, Failed and any other
  // (Cancelled, Expired, a status added later) answer as a decline.
  if (RESOLVED_STATUSES.includes(transaction.status)) {
    return { outcome: "resolve", status: 200, body: approvedBody(transaction, ctx) };
  }
  if (transaction.status === "Declined" && transaction.decline_code === GUARDIAN_DECLINE_CODE) {
    return { outcome: "resolve", status: 200, body: guardianBody(transaction) };
  }
  return { outcome: "reject", status: 404, body: declinedBody(transaction, ctx) };
}

/** The body checkout-router answered on a failed start: its own shape, never the core's raw error. */
function buildCheckoutRouterErrorBody(status: number, body: any) {
  return {
    status: String(status),
    message: body?.error?.message ?? "Error",
    psp_response: [],
    is_route_finished: false,
  };
}
