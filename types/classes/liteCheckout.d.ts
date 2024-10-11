import { TokensRequest } from "../types/skyflow";
declare global {
    interface Window {
        OpenPay: any;
    }
}
type LiteCheckoutConstructor = {
    signal: AbortSignal;
    baseUrlTonder: string;
    publicApiKeyTonder: string;
};
export declare class LiteCheckout {
    baseUrlTonder: string;
    signal: AbortSignal;
    publicApiKeyTonder: string;
    constructor({ signal, baseUrlTonder, publicApiKeyTonder }: LiteCheckoutConstructor);
    getOpenpayDeviceSessionID(merchant_id: string, public_key: string): Promise<any>;
    getBusiness(): Promise<any>;
    customerRegister(email: string): Promise<any>;
    createOrder(orderItems: any): Promise<any>;
    createPayment(paymentItems: {
        business_pk: string;
    }): Promise<any>;
    startCheckoutRouter(routerItems: any): Promise<any>;
    getSkyflowTokens({ vault_id, vault_url, data }: TokensRequest): Promise<any>;
    getVaultToken(): Promise<any>;
    getCustomerCards(customerToken: string, query: string): Promise<any>;
}
export {};
