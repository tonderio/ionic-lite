type CheckoutType = {
    apiKey?: string;
    type: string;
    backgroundColor: string;
    color: string;
    cb: (params?: any) => void;
    url: string;
};
export declare class Checkout {
    url: string;
    apiKey?: string;
    type: string;
    backgroundColor: string;
    color: string;
    params: string;
    order: any;
    buttonText: string;
    cb: (params: any) => void;
    tonderButton: any;
    constructor({ apiKey, type, backgroundColor, color, cb, url }: CheckoutType);
    generateButton: (buttonText: string) => void;
    getButton: ({ buttonText }: {
        buttonText: string;
    }) => any;
    mountButton: ({ buttonText }: {
        buttonText: string;
    }) => void;
    stylishButton: (element: HTMLElement) => void;
    setOrder: ({ products, email, shippingCost }: {
        products: any;
        email: string;
        shippingCost: string;
    }) => any;
    openTabListener: (tab: any, button: HTMLButtonElement) => void;
    openCheckout: () => void;
    getUrlParams: () => string;
    receiveMessage(event: any): void;
}
export {};
