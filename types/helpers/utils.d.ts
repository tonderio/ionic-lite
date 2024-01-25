export declare function addScripts(): Promise<void>;
export declare function toCurrency(value: string | number): string | false;
export declare function showError(message: string): void;
export declare const createObserver: ({ target }: {
    target: string;
}) => Promise<any>;
