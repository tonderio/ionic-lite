import { MESSAGES_EN } from '../constants/messages';
import { ErrorKeyEnum } from '../enum/ErrorKeyEnum';

const DEFAULT_SYSTEM_ERROR = 'APP_INTERNAL_001';
const LOCK_ERROR_CODE_KEY = '__tonderLockErrorCode__';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export interface IAppErrorInput {
    errorCode: string;
    message?: string;
    statusCode?: number;
    details?: Record<string, unknown>;
    originalError?: unknown;
    lockErrorCode?: boolean;
}

export class AppError extends Error {
    public readonly status: 'error' = 'error';
    public readonly code: string;
    public readonly statusCode: number;
    public readonly originalError?: unknown;
    public details: Record<string, unknown>;

    constructor(error: IAppErrorInput) {
        const resolvedStatusCode = AppError.resolveStatusCode(
            error.statusCode,
            error.originalError,
        );
        const resolvedMessage = AppError.resolveMessage(
            error.errorCode,
            error.message,
        );
        const resolvedSystemError = AppError.resolveSystemError(
            error.details?.systemError,
            error.originalError,
        );

        super(resolvedMessage);

        Object.setPrototypeOf(this, new.target.prototype);

        this.name = 'TonderError';
        this.code = error.errorCode;
        this.statusCode = resolvedStatusCode;
        this.originalError = error.originalError;
        this.details = {
            code: error.errorCode,
            statusCode: resolvedStatusCode,
            systemError: resolvedSystemError,
        };

        if (error.lockErrorCode) {
            Object.defineProperty(this, LOCK_ERROR_CODE_KEY, {
                value: true,
                enumerable: false,
                configurable: true,
            });
        }

        Error.captureStackTrace?.(this, AppError);
    }

    private static isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
    }

    public static parseStatusCode(code: unknown): number {
        const parsed = Number(code);
        if (!Number.isFinite(parsed)) return 500;
        if (parsed < 100 || parsed > 599) return 500;
        return Math.trunc(parsed);
    }

    public static resolveStatusCode(
        explicitStatusCode: unknown,
        originalError?: unknown,
    ): number {
        const candidates: unknown[] = [explicitStatusCode];

        if (AppError.isRecord(originalError)) {
            candidates.push(
                originalError.statusCode,
                originalError.status,
            );

            const body = AppError.isRecord(originalError.body)
                ? originalError.body
                : null;
            if (body) {
                candidates.push(body.statusCode, body.status);
            }
        }

        for (const candidate of candidates) {
            if (AppError.isHttpStatusCode(candidate)) {
                return Math.trunc(Number(candidate));
            }
        }

        return 500;
    }

    public static resolveMessage(errorCode: string, message?: string): string {
        if (message) return message;
        return (
            MESSAGES_EN[errorCode] ||
            MESSAGES_EN[ErrorKeyEnum.UNKNOWN_ERROR] ||
            'An unexpected error occurred.'
        );
    }

    public static isHttpStatusCode(value: unknown): boolean {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 100 && parsed <= 599;
    }

    public static normalizeSystemError(value: unknown): string | null {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed || null;
    }

    public static resolveSystemError(
        explicitSystemError: unknown,
        originalError?: unknown,
    ): string {
        const candidates: unknown[] = [explicitSystemError];

        if (AppError.isRecord(originalError)) {
            const details = AppError.isRecord(originalError.details)
                ? originalError.details
                : null;
            const body = AppError.isRecord(originalError.body)
                ? originalError.body
                : null;
            const bodyDetails = body && AppError.isRecord(body.details)
                ? body.details
                : null;

            candidates.push(
                originalError.systemError,
                originalError.code,
                details?.systemError,
                details?.code,
                body?.systemError,
                body?.code,
                bodyDetails?.systemError,
                bodyDetails?.code,
            );
        }

        for (const candidate of candidates) {
            const resolved = AppError.normalizeSystemError(candidate);
            if (resolved) return resolved;
        }

        return DEFAULT_SYSTEM_ERROR;
    }
}

export interface IBuildPublicAppErrorInput {
    errorCode: string;
    message?: string;
    details?: Record<string, unknown>;
    statusCode?: number;
    response?: Response;
    lockErrorCode?: boolean;
}

function markErrorCodeLocked(error: Record<string, unknown>): void {
    Object.defineProperty(error, LOCK_ERROR_CODE_KEY, {
        value: true,
        enumerable: false,
        configurable: true,
    });
}

function hasLockedErrorCode(error: unknown): boolean {
    return isRecord(error) && error[LOCK_ERROR_CODE_KEY] === true;
}

function isTonderAppErrorLike(error: unknown): error is AppError {
    return (
        isRecord(error) &&
        error.name === 'TonderError' &&
        typeof error.code === 'string'
    );
}

function getOriginalError(error: unknown): unknown {
    if (error instanceof AppError) {
        return error.originalError !== undefined ? error.originalError : error;
    }

    return error;
}

async function parseResponseBody(response: Response): Promise<unknown> {
    try {
        return await response.clone().json();
    } catch (_) {
        // Ignore JSON parsing errors and fallback to text.
    }

    try {
        const text = await response.text();
        return text || undefined;
    } catch (_) {
        return undefined;
    }
}

function buildPublicAppErrorSync(
    data: IBuildPublicAppErrorInput,
    error?: unknown,
): AppError {
    if (!data?.errorCode) {
        throw new Error('buildPublicAppError requires errorCode');
    }

    const explicitSystemError = data.details?.systemError;
    const hasExplicitOverrides =
        !!data.message ||
        data.statusCode !== undefined ||
        explicitSystemError !== undefined;

    if (isTonderAppErrorLike(error)) {
        if (data.lockErrorCode) {
            markErrorCodeLocked(error as unknown as Record<string, unknown>);
        }

        if (!hasExplicitOverrides) {
            if (data.errorCode === error.code || hasLockedErrorCode(error)) {
                return error;
            }
        }
    }

    return new AppError({
        errorCode: data.errorCode,
        message: data.message,
        statusCode: data.statusCode,
        details:
            explicitSystemError !== undefined
                ? { systemError: explicitSystemError }
                : undefined,
        originalError: getOriginalError(error),
        lockErrorCode: data.lockErrorCode || hasLockedErrorCode(error),
    });
}

async function buildPublicAppErrorFromHttpResponse(
    data: IBuildPublicAppErrorInput & { response: Response },
): Promise<AppError> {
    const body = await parseResponseBody(data.response);

    const originalError: Record<string, unknown> = {
        status: data.response.status,
    };

    if (data.response.statusText) {
        originalError.statusText = data.response.statusText;
    }

    if (body !== undefined) {
        originalError.body = body;
    }

    return new AppError({
        errorCode: data.errorCode,
        message: data.message,
        statusCode: data.statusCode ?? data.response.status,
        details:
            data.details?.systemError !== undefined
                ? { systemError: data.details.systemError }
                : undefined,
        originalError,
        lockErrorCode: data.lockErrorCode,
    });
}

export function buildPublicAppError(
    data: IBuildPublicAppErrorInput & { response: Response },
    error?: unknown,
): Promise<AppError>;
export function buildPublicAppError(
    data: IBuildPublicAppErrorInput,
    error?: unknown,
): AppError;
export function buildPublicAppError(
    data: IBuildPublicAppErrorInput,
    error?: unknown,
): AppError | Promise<AppError> {
    if (data?.response) {
        return buildPublicAppErrorFromHttpResponse(
            data as IBuildPublicAppErrorInput & { response: Response },
        );
    }

    return buildPublicAppErrorSync(data, error);
}
