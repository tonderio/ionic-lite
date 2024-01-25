type ThreeDSHandlerContructor = {
    payload?: any;
    apiKey?: string;
    baseUrl?: string;
    successUrl?: Location | string;
};
export declare class ThreeDSHandler {
    baseUrl?: string;
    apiKey?: string;
    payload?: any;
    successUrl?: Location | string;
    constructor({ payload, apiKey, baseUrl, successUrl }: ThreeDSHandlerContructor);
    saveVerifyTransactionUrl(): void;
    removeVerifyTransactionUrl(): void;
    getVerifyTransactionUrl(): string | null;
    redirectTo3DS(): boolean;
    getURLParameters(): any;
    verifyTransactionStatus(): Promise<unknown>;
}
export {};
