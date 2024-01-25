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
export type Business = {
    vault_id: string;
    vault_url: string;
    openpay_keys: {
        merchant_id: string;
        public_key: string;
    };
    reference: string;
    business: {
        pk: string;
    };
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
