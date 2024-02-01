export type Business = {
    business: {
        pk: number;
        name: string;
        categories: {
            pk: number;
            name: string;
        }[];
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
    openpay_keys: {
        merchant_id: string;
        public_key: string;
    };
    fintoc_keys: {
        public_key: string;
    };
    vault_id: string;
    vault_url: string;
    reference: number;
    is_installments_available: boolean;
};

export type Customer = {
    firstName: string;
    lastName: string;
    country: string;
    street: string;
    city: string;
    state: string;
    postCode: string;
    email: string;
    phone: string;
};

export type OrderItem = {
    description: string;
    quantity: number;
    price_unit: number;
    discount: number;
    taxes: number;
    product_reference: number;
    name: string;
    amount_total: number;
};

export type PaymentData = {
    customer: Customer;
    cart: {
        total: string | number;
        items: OrderItem[];
    };
};
