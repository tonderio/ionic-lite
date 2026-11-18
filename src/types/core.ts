/** Which backend charges and finishes one payment. It is chosen once and never changes. */
export type PaymentEngine = "core" | "legacy";

export interface ICoreRouting {
    checkout_id?: string;
    is_route_finished?: boolean;
    decline_type?: "Hard" | "Soft" | null;
    rejected_psp_responses?: Record<string, any>[];
}

/**
 * What the core answers to `/transactions/v1/process` and `/transactions/v1/{id}` for a
 * first-party (`sdk/ionic`) payment: Direct API's body plus the fields the SDK needs to
 * rebuild the result merchants get today.
 */
export interface ICoreTransactionResponse {
    id: string;
    status: string;
    amount?: number | string;
    currency?: string;
    provider?: string | null;
    next_action?: Record<string, any>;
    decline_code?: string;
    decline_reason?: string;
    payment_id?: number;
    transaction_id?: string;
    routing?: ICoreRouting;
    transaction_status?: string;
    psp_response?: Record<string, any>;
}
