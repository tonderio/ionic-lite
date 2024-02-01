import {
    Business,
    OrderItem,
    CreateOrderResponse,
    CreatePaymentRequest,
    CreatePaymentResponse,
    StartCheckoutRequest,
    StartCheckoutResponse,
} from "../../src/types/commons";
import { TokensRequest } from "../../src/types/skyflow";

export class BusinessClass implements Business {
    business!: {
        pk: number;
        name: string;
        categories: [{ pk: number; name: string }];
        web: string;
        logo: string;
        full_logo_url: string;
        background_color: string;
        primary_color: string;
        checkout_mode: boolean;
        textCheckoutColor: string;
        textDetailsColor: string;
        checkout_logo: string;
    };
    openpay_keys!: { merchant_id: string; public_key: string };
    fintoc_keys!: { public_key: string };
    vault_id!: string;
    vault_url!: string;
    reference!: number;
    is_installments_available!: boolean;
}

export class OrderItemClass implements OrderItem {
    description!: string;
    quantity!: number;
    price_unit!: number;
    discount!: number;
    taxes!: number;
    product_reference!: number;
    name!: string;
    amount_total!: number;
}

export class OrderResponseClass implements CreateOrderResponse {
    id!: number;
    created!: string;
    amount!: string;
    status!: string;
    payment_method?: string | undefined;
    reference?: string | undefined;
    is_oneclick!: boolean;
    items!: [
        {
            description: string;
            product_reference: string;
            quantity: string;
            price_unit: string;
            discount: string;
            taxes: string;
            amount_total: string;
        }
    ];
    billing_address?: string | undefined;
    shipping_address?: string | undefined;
    client!: {
        email: string;
        name: string;
        first_name: string;
        last_name: string;
        client_profile: {
            gender: string;
            date_birth?: string | undefined;
            terms: boolean;
            phone: string;
        };
    };
}

export class CreatePaymentRequestClass implements CreatePaymentRequest {
    business_pk!: string;
}

export class CreatePaymentResponseClass implements CreatePaymentResponse {
    pk!: number;
    order?: string | undefined;
    amount!: string;
    status!: string;
    date!: string;
    paid_date?: string | undefined;
    shipping_address!: {
        street: string;
        number: string;
        suburb: string;
        city: { name: string };
        state: { name: string; country: { name: string } };
        zip_code: string;
    };
    shipping_address_id?: string | undefined;
    billing_address!: {
        street: string;
        number: string;
        suburb: string;
        city: { name: string };
        state: { name: string; country: { name: string } };
        zip_code: string;
    };
    billing_address_id?: string | undefined;
    client?: string | undefined;
    customer_order_reference?: string | undefined;
}

export class StartCheckoutRequestClass implements StartCheckoutRequest {
    card: any;
    name: any;
    last_name!: string;
    email_client: any;
    phone_number: any;
    return_url!: string;
    id_product!: string;
    quantity_product!: number;
    id_ship!: string;
    instance_id_ship!: string;
    amount: any;
    title_ship!: string;
    description!: string;
    device_session_id: any;
    token_id!: string;
    order_id: any;
    business_id: any;
    payment_id: any;
    source!: string;
}

export class StartCheckoutResponseClass implements StartCheckoutResponse {
    status!: number;
    message!: string;
    psp_response!: {
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
    transaction_status!: string;
    transaction_id!: number;
    payment_id!: number;
    provider!: string;
    next_action!: {
        redirect_to_url: {
            url: string;
            return_url: string;
            verify_transaction_status_url: string;
        };
    };
    actions!: [
        {
            name: string;
            url: string;
            method: string;
        }
    ];
}

export class TokensRequestClass implements TokensRequest {
    vault_id!: string;
    vault_url!: string;
    data: { [key: string]: any } = {};
}
