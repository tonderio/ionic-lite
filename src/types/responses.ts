import { Business } from "./commons";

export interface IErrorResponse extends Error {
    code?: string;
    body?: string;
}

export interface GetBusinessResponse extends Business { }

export type GetVaultTokenResponse = {
    token: string;
};

export type CustomerRegisterResponse = {
    id: number | string;
    email: string;
    auth_token: string;
};

export type CreateOrderResponse = {
    id: number | string;
    created: string;
    amount: string;
    status: string;
    payment_method?: string;
    reference?: string;
    is_oneclick: boolean;
    items: {
        description: string;
        product_reference: string;
        quantity: string;
        price_unit: string;
        discount: string;
        taxes: string;
        amount_total: string;
    }[];
    billing_address?: string;
    shipping_address?: string;
    client: {
        email: string;
        name: string;
        first_name: string;
        last_name: string;
        client_profile: {
            gender: string;
            date_birth?: string;
            terms: boolean;
            phone: string;
        };
    };
};

export type CreatePaymentResponse = {
    pk: number | string;
    order?: string;
    amount: string;
    status: string;
    date: string;
    paid_date?: string;
    shipping_address: {
        street: string;
        number: string;
        suburb: string;
        city: {
            name: string;
        };
        state: {
            name: string;
            country: {
                name: string;
            };
        };
        zip_code: string;
    };
    shipping_address_id?: string;
    billing_address: {
        street: string;
        number: string;
        suburb: string;
        city: {
            name: string;
        };
        state: {
            name: string;
            country: {
                name: string;
            };
        };
        zip_code: string;
    };
    billing_address_id?: string;
    client?: string;
    customer_order_reference?: string;
};

export type StartCheckoutResponse = {
    status: number;
    message: string;
    psp_response: {
        id: string;
        authorization: number;
        operation_type: string;
        transaction_type: string;
        status: string;
        conciliated: boolean;
        creation_date: string;
        operation_date: string;
        description: string;
        error_message?: string;
        order_id?: string;
        card: {
            type: string;
            brand: string;
            address?: string;
            card_number: string;
            holder_name: string;
            expiration_year: string;
            expiration_month: string;
            allows_charges: boolean;
            allows_payouts: boolean;
            bank_name: string;
            points_type: string;
            points_card: boolean;
            bank_code: number;
        };
        customer_id: string;
        gateway_card_present: string;
        amount: number;
        fee: {
            amount: number;
            tax: number;
            currency: string;
        };
        payment_method: {
            type: string;
            url: string;
        };
        currency: string;
        method: string;
        object: string;
    };
    is_route_finished: Boolean;
    transaction_status: string;
    transaction_id: number;
    payment_id: number;
    provider: string;
    next_action: {
        redirect_to_url: {
            url: string;
            return_url: string;
            verify_transaction_status_url: string;
        };
        iframe_resources?: {
            iframe: string;
        };
    };
    actions: {
        name: string;
        url: string;
        method: string;
    }[];
};

export type TokensResponse = {
    vaultID: string;
    responses: {
        [key: string]: string;
    }[];
};

export type GetCustomerCardsResponse = {
    user_id: number;
    cards: {
        fields: {
            card_scheme: string;
            card_number: string;
            cardholder_name: string;
            cvv: string;
            expiration_month: string;
            expiration_year: string;
            skyflow_id: string;
        };
    }[];
};

export type RegisterCustomerCardResponse = {
    skyflow_id: string;
    user_id: number;
};

export type GetSecureTokenResponse = {
    access: string
}