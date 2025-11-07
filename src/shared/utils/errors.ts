import {MESSAGES_EN} from "../constants/messages";

export interface IParamsTonderError {
    code: string;
    message?: string;
    details?: any;
}

class TonderError extends Error {
    public details: { code: string; message: string; [key: string]: any };
    public code: string;
    constructor(params: IParamsTonderError) {
        const resolvedMessage =
            params.message || MESSAGES_EN[params.code] || 'Unknown error';
        super(resolvedMessage);
        this.name = 'TonderError';
        this.code = params.code;
        this.details = {
            code: params.details?.code || params.code,
            message: params.details?.message || resolvedMessage,
        };
    }
}

export default TonderError;
