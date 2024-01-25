type SkyflowRecord = {
    method: string;
    quorum?: boolean;
    tableName: string;
    fields?: {
        [key: string]: string;
    };
    ID?: string;
    tokenization?: boolean;
    batchID?: string;
    redaction?: "DEFAULT" | "REDACTED" | "MASKED" | "PLAIN_TEXT";
    downloadURL?: boolean;
    upsert?: string;
    tokens?: {
        [key: string]: string;
    };
};
export type VaultRequest = {
    records: SkyflowRecord[];
    continueOnError?: boolean;
    byot?: "DISABLE" | "ENABLE" | "ENABLE_STRICT";
};
export type TokensRequest = {
    baseUrl: string;
    vault_id: string;
    vault_url: string;
    apiKey: string;
    signal: AbortSignal;
    data: {
        [key: string]: any;
    };
};
export type TokensResponse = {
    vaultID: string;
    responses: {
        [key: string]: string;
    }[];
};
export {};
