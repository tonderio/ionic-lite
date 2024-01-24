import { TokensRequest } from "../types/skyflow.ds";
declare global {
    interface Window {
        OpenPay: any;
    }
}
export declare function getOpenpayDeviceSessionID(merchant_id: string, public_key: string, signal: AbortSignal): Promise<any>;
export declare function getBusiness(baseUrlTonder: string, signal: AbortSignal, apiKeyTonder?: string): Promise<any>;
export declare function customerRegister(baseUrlTonder: string, email: string, signal: AbortSignal, apiKeyTonder?: string): Promise<any>;
export declare function createOrder(baseUrlTonder: string, orderItems: any, apiKeyTonder?: string): Promise<any>;
export declare function createPayment(baseUrlTonder: string, paymentItems: {
    business_pk: string;
}, apiKeyTonder?: string): Promise<any>;
export declare function startCheckoutRouter(baseUrlTonder: string, routerItems: any, apiKeyTonder?: string): Promise<any>;
export declare function getSkyflowTokens({ baseUrl, apiKey, vault_id, vault_url, signal, data }: TokensRequest): Promise<any>;
export declare function getVaultToken({ baseUrl, apiKey, signal }: {
    baseUrl: string;
    apiKey: string;
    signal: AbortSignal;
}): Promise<any>;
