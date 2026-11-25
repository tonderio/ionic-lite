/** Which backend charges and finishes one payment. It is chosen once and never changes. */
export type PaymentEngine = "core" | "legacy";

/** Where the customer and saved-card calls go: tokens are not interchangeable, so both always share one engine. */
export interface ISupportTarget {
    engine: PaymentEngine;
    baseUrl: string;
}

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
    operation_type?: string;
    status: string;
    amount?: number | string;
    currency?: string;
    created_at?: string;
    updated_at?: string;
    metadata?: Record<string, any> | null;
    card_brand?: string | null;
    transaction_reference?: string | null;
    number_of_payment_attempts?: number | null;
    number_of_installments?: number | null;
    three_d_secure?: Record<string, any> | null;
    reason?: string | null;
    operation_date?: string;
    decline?: Record<string, any> | null;
    provider?: string | null;
    next_action?: Record<string, any>;
    decline_code?: string;
    decline_reason?: string;
    payment_id?: number;
    transaction_id?: string;
    routing?: ICoreRouting;
    transaction_status?: string;
    psp_response?: Record<string, any>;
    payment_method_type?: string;
}
