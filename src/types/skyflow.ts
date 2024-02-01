export type SkyflowRecord = {
    method: string;
    quorum?: boolean;
    tableName: string;
    fields?: {
        [key: string]: string;
    },
    ID?: string,
    tokenization?: boolean,
    batchID?: string,
    redaction?: "DEFAULT" | "REDACTED" | "MASKED" | "PLAIN_TEXT",
    downloadURL?: boolean,
    upsert?: string,
    tokens?: {
        [key: string]: string;
    }
}
