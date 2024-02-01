import { IErrorResponse } from "../types/responses";

export class ErrorResponse implements IErrorResponse {
    code?: string | undefined;
    body?: string | undefined;
    name!: string;
    message!: string;
    stack?: string | undefined;

    constructor({ code, body, name, message, stack }: IErrorResponse) {
        this.code = code;
        this.body = body;
        this.name = name;
        this.message = message;
        this.stack = stack;
    }
}