import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
    buildPublicAppError,
} from "../shared/utils/appError";

export async function getCustomerAPMs(baseUrlTonder: string, publicApiKeyTonder: string, query: string = "?status=active&page_size=10000&country=México", signal:  AbortSignal | null | undefined = null) {
    const response = await fetch(
        `${baseUrlTonder}/api/v1/payment_methods${query}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Token ${publicApiKeyTonder}`,
                'Content-Type': 'application/json'
            },
            signal
        });

    if (response.ok) return await response.json();
    throw await buildPublicAppError({
        response,
        errorCode: ErrorKeyEnum.FETCH_PAYMENT_METHODS_ERROR,
    });
}
