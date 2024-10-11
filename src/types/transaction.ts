export interface ITransaction {
    id: number;
    provider: string;
    country: string;
    currency_code: string;
    transaction_status: string;
    created: string;
    modified: string;
    operation_date: string;
    transaction_reference: string;
    transaction_type: string;
    status: string;
    amount: string;
    related_transaction_reference?: null | string;
    reason?: null | string;
    is_refunded?: null | boolean;
    is_disputed?: null | boolean;
    number_of_payment_attempts: number;
    card_brand?: null | string;
    number_of_installments: number;
    payment?: {
        id: number;
        created: string;
        modified: string;
        amount: string;
        status: string;
        date: string;
        paid_date: null | string;
        source: null | string;
        customer_order_reference: null | string;
        client: number;
        business: number;
        shipping_address?: null | string;
        billing_address?: null | string;
        order: number;
    };
    checkout: {
        id: string;
        created: string;
        modified: string;
        checkout_data: {
            name: string;
            amount: number;
            source: string;
            id_ship: string;
            currency: string;
            order_id: number;
            token_id: string;
            last_name: string;
            id_product: string;
            ip_address: string;
            payment_id: number;
            return_url: string;
            title_ship: string;
            business_id: number;
            checkout_id: string;
            description: string;
            browser_info: {
                language: string;
                time_zone: number;
                user_agent: string;
                color_depth: number;
                screen_width: number;
                screen_height: number;
                javascript_enabled: boolean;
            };
            email_client: string;
            phone_number: string;
            instance_id_ship: string;
            quantity_product: number;
            device_session_id: null | string;
            number_of_payment_attempts: number;
        };
        number_of_payment_attempts: number;
        tried_psps: string[];
        rejected_transactions: string[];
        routing_step: number;
        route_length: number;
        last_status: string;
        ip_address: string;
        is_dynamic_routing: boolean;
        is_route_finished: boolean;
        business: number;
        payment: number;
    };
    currency: {
        id: number;
        name: string;
        code: string;
        symbol: string;
        country: null | string;
    };
    payment_method?: null | {
        id: number;
        name: string;
        display_name: string;
        category: string;
        is_apm: boolean;
    };
    issuing_country?: null | string;
}
