import { OrderItem } from "./commons";
import { SkyflowRecord } from "./skyflow";

export interface CreateOrderRequest {
    business: string,
    client: string,
    billing_address_id?: number | null,
    shipping_address_id?: number | null,
    amount: number,
    status?: string,
    reference: string | number,
    is_oneclick: boolean,
    items: OrderItem[]
}

export type CreatePaymentRequest = {
    business_pk?: string | number,
    amount: number,
    date?: string,
    order_id?: string | number
    client_id?: string | number
}

export type StartCheckoutRequest = {
    card: any,
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
    currency: string
}

export interface VaultRequest extends SkyflowRecord {
    records: SkyflowRecord[],
    continueOnError?: boolean,
    byot?: "DISABLE" | "ENABLE" | "ENABLE_STRICT"
}

export type RegisterCustomerCardRequest = {
    skyflow_id: string;
}

export type TokensRequest = {
    vault_id: string,
    vault_url: string,
    data: {
        [key: string]: any;
    }
}