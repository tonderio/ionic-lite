import { SkyflowRecord } from "./skyflow";
import {IItem} from "./checkout";

export interface CreateOrderRequest {
    business: string,
    client: string,
    billing_address_id?: number | null,
    shipping_address_id?: number | null,
    amount: number,
    status?: string,
    reference: string | number,
    is_oneclick: boolean,
    items: IItem[]
}

export type CreatePaymentRequest = {
    business_pk?: string | number,
    amount: number,
    date?: string,
    order_id?: string | number
    client_id?: string | number
}

export type StartCheckoutRequestBase = {
    name: any,
    last_name: string,
    email_client: any,
    phone_number: any,
    return_url?: string,
    id_product: string,
    quantity_product: number,
    id_ship: string,
    instance_id_ship: string,
    amount: any,
    title_ship: string,
    description: string,
    device_session_id: any,
    token_id: string,
    order_id: any,
    business_id: any,
    payment_id: any,
    source: string,
    browser_info?: any,
    metadata: any,
    currency: string,
}

export type StartCheckoutRequestWithCard = StartCheckoutRequestBase & {
    card: any,
    payment_method?: never,
}

export type StartCheckoutRequestWithPaymentMethod = StartCheckoutRequestBase & {
    card?: never,
    payment_method: string,
}

export type StartCheckoutRequest = StartCheckoutRequestWithCard | StartCheckoutRequestWithPaymentMethod;

export type StartCheckoutIdRequest = { 
    checkout_id: any
}

export interface VaultRequest extends SkyflowRecord {
    records: SkyflowRecord[],
    continueOnError?: boolean,
    byot?: "DISABLE" | "ENABLE" | "ENABLE_STRICT"
}

export type RegisterCustomerCardRequest = {
    skyflow_id: string;
}

export type TokensSkyflowRequest = {
    baseUrl: string;
    apiKey: string;
    vault_id: string,
    vault_url: string,
    data?: {
        [key: string]: any;
    }
}
export type TokensRequest = {
    vault_id: string,
    vault_url: string,
    data: {
        [key: string]: any;
    }
}

export type StartCheckoutFullRequest = {
    order: {
        items: IItem[];
    };
    total: number;
    customer: {
        name: string;
        lastname: string;
        email: string;
        phone: string;
    };
    skyflowTokens: {
        cardholder_name: string;
        card_number: string;
        cvv: string;
        expiration_year: string;
        expiration_month: string;
        skyflow_id: string;
    };
    return_url: string;
    isSandbox: boolean;
    metadata: any;
    currency: string;
    payment_method?: string;
}