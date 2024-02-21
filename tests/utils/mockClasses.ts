import { Business, OrderItem } from "../../src/types/commons";
import {
    CreateOrderRequest,
    CreatePaymentRequest,
    RegisterCustomerCardRequest,
    StartCheckoutRequest,
    TokensRequest,
} from "../../src/types/requests";
import {
    CreateOrderResponse,
    CreatePaymentResponse,
    GetBusinessResponse,
    GetCustomerCardsResponse,
    RegisterCustomerCardResponse,
    StartCheckoutResponse,
} from "../../src/types/responses";

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

    get mockObject(): GetBusinessResponse {
        return {
            business: {
                pk: 1234,  // Número de ejemplo
                name: 'Mock Business Name',
                categories: [
                    { pk: 5678, name: 'Mock Category 1' },
                    { pk: 9012, name: 'Mock Category 2' }
                ],
                web: 'https://www.mockbusiness.com',
                logo: 'assets/images/mock-logo.png',
                full_logo_url: 'https://www.mockbusiness.com/logo.png',
                background_color: '#f5f5f5',
                primary_color: '#007bff',
                checkout_mode: true,
                textCheckoutColor: '#333333',
                textDetailsColor: '#666666',
                checkout_logo: 'assets/images/checkout-logo.png',
            },
            vault_id: 'mock-vault-id-123',
            vault_url: 'https://mock-vault.com',
            reference: 987654,
            is_installments_available: true,
            openpay_keys: { merchant_id: "", public_key: "" },
            fintoc_keys: { public_key: "" }
        }
    }
}

export class OrderClass implements CreateOrderRequest {
    business!: string;
    client!: string;
    billing_address_id!: string;
    shipping_address_id!: string;
    amount!: number;
    status!: string;
    reference!: string;
    is_oneclick!: boolean;
    items!: OrderItem[];

    get mockObject(): CreateOrderRequest {
        return {
            business: "The business pk",
            client: "Client auth token",
            billing_address_id: "The billing address",
            shipping_address_id: "The shipping address",
            amount: 25,
            status: "PENDING",
            reference: "XXXXXXX",
            is_oneclick: false,
            items: [
                { ...new OrderItemClass() }
            ]
        }

    }
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

    get mockObject(): OrderItem {
        return {
            description: "string",
            quantity: 0,
            price_unit: 0,
            discount: 0,
            taxes: 0,
            product_reference: 0,
            name: "string",
            amount_total: 0,
        }

    }
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

    get mockObject(): CreateOrderResponse {
        return {
            id: 12345,
            created: '2024-02-01T10:42:00Z',
            amount: '123.45',
            status: 'APPROVED',
            payment_method: 'CREDIT_CARD',
            reference: 'PAYMENT_REF_12345',
            is_oneclick: true,
            items: [
                {
                    description: 'Mock Item 1',
                    product_reference: 'PRD-123',
                    quantity: '2',
                    price_unit: '50.00',
                    discount: '5.00',
                    taxes: '10.90',
                    amount_total: '105.90',
                },
                {
                    description: 'Mock Item 2',
                    product_reference: 'PRD-456',
                    quantity: '1',
                    price_unit: '73.45',
                    discount: '0.00',
                    taxes: '6.55',
                    amount_total: '79.00',
                },
            ],
            billing_address: 'Mock Street 123, Mock City',
            shipping_address: 'Mock Avenue 456, Mock Town',
            client: {
                email: 'mockuser@example.com',
                name: 'Mock User',
                first_name: 'Mock',
                last_name: 'User',
                client_profile: {
                    gender: 'M',
                    date_birth: '1990-01-01',
                    terms: true,
                    phone: '+1234567890',
                },
            },
        }
    }
}

export class CreatePaymentRequestClass implements CreatePaymentRequest {
    business_pk!: string;
    amount!: number;
    date!: string;
    order!: string;

    get mockObject(): CreatePaymentRequest {
        const now = new Date();
        const dateString = now.toISOString();
        return {
            business_pk: "NNNNNNNNNN",
            amount: 25,
            date: dateString,
            order: "XXXXX"
        };
    }
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

    get mockObject(): CreatePaymentResponse {
        return {
            pk: 45678,
            order: "ORDER-98765",
            amount: "250.00",
            status: "PENDING",
            date: "2024-02-01T14:29:05Z",
            paid_date: "",
            shipping_address: {
                street: "Mock Street 123",
                number: "10",
                suburb: "Mock Suburb",
                city: { name: "Mock City" },
                state: { name: "Mock State", country: { name: "Mock Country" } },
                zip_code: "12345",
            },
            shipping_address_id: "",
            billing_address: {
                street: "Mock Street 456",
                number: "20",
                suburb: "Mock Suburb 2",
                city: { name: "Mock City 2" },
                state: { name: "Mock State 2", country: { name: "Mock Country 2" } },
                zip_code: "54321",
            },
            billing_address_id: "",
            client: "CLIENT-123",
            customer_order_reference: "REF-ABC123",
        };
    }
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

    get mockObject(): StartCheckoutRequest {
        return {
            card: " any",
            name: " any",
            last_name: " string",
            email_client: " any",
            phone_number: " any",
            return_url: " string",
            id_product: " string",
            quantity_product: 0,
            id_ship: " string",
            instance_id_ship: " string",
            amount: " any",
            title_ship: " string",
            description: " string",
            device_session_id: " any",
            token_id: " string",
            order_id: " any",
            business_id: " any",
            payment_id: " any",
            source: " string",
        };
    }
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
    actions!: {
        name: string;
        url: string;
        method: string;
    }[];

    get mockObject(): StartCheckoutResponse {
        return {
            status: 200, // Representa un estado exitoso
            message: "Payment processing initiated",
            transaction_status: "PENDING",
            transaction_id: 1234567890,
            payment_id: 9876543210,
            provider: "STRIPE",
            next_action: {
                redirect_to_url: {
                    url: "https://www.mock-payment-provider.com/checkout",
                    return_url: "https://your-app.com/payment-confirmation",
                    verify_transaction_status_url:
                        "https://api.mock-payment-provider.com/transactions/1234567890/status",
                },
            },
            psp_response: {
                id: " string",
                authorization: 0,
                operation_type: " string",
                transaction_type: " string",
                status: " string",
                conciliated: false,
                creation_date: " string",
                operation_date: " string",
                description: " string",
                error_message: " string",
                order_id: " string",
                card: {
                    type: " string",
                    brand: " string",
                    address: " string",
                    card_number: " string",
                    holder_name: " string",
                    expiration_year: " string",
                    expiration_month: " string",
                    allows_charges: false,
                    allows_payouts: false,
                    bank_name: " string",
                    points_type: " string",
                    points_card: false,
                    bank_code: 0,
                },
                customer_id: " string",
                gateway_card_present: " string",
                amount: 0,
                fee: {
                    amount: 0,
                    tax: 0,
                    currency: " string",
                },
                payment_method: {
                    type: " string",
                    url: " string",
                },
                currency: " string",
                method: " string",
                object: " string",
            },
            actions: [
                {
                    name: "Check status",
                    url: "https://api.mock-payment-provider.com/transactions/1234567890/status",
                    method: "GET",
                },
                {
                    name: "Cancel payment",
                    url: "https://api.mock-payment-provider.com/transactions/1234567890/cancel",
                    method: "POST",
                },
            ],
        };
    }
}

export class TokensRequestClass implements TokensRequest {
    vault_id!: string;
    vault_url!: string;
    data: { [key: string]: any } = {};

    get mockObject(): TokensRequest {
        return {
            vault_id: "string",
            vault_url: "string",
            data: {
                fields: [],
            },
        };
    }
}

export class RegisterCustomerCardResponseClass
    implements RegisterCustomerCardResponse {
    skyflow_id!: string;
    user_id!: number;

    get mockObject(): RegisterCustomerCardResponse {
        return {
            skyflow_id: "string",
            user_id: 0,
        };
    }
}

export class RegisterCustomerCardRequestClass
    implements RegisterCustomerCardRequest {
    skyflow_id!: string;

    get mockObject(): RegisterCustomerCardRequest {
        return {
            skyflow_id: "",
        };
    }
}

export class GetCustomerCardsResponseClass implements GetCustomerCardsResponse {
    user_id!: number;
    cards!: {
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

    get mockObject(): GetCustomerCardsResponse {
        return {
            user_id: 0,
            cards: [
                {
                    fields: {
                        card_scheme: "string",
                        card_number: "string",
                        cardholder_name: "string",
                        cvv: "string",
                        expiration_month: "string",
                        expiration_year: "string",
                        skyflow_id: "string",
                    },
                },
            ],
        };
    }
}
