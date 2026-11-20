import { API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import { fromCorePaymentMethods, buildSupportError } from "../helpers/coreSupport";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
    buildPublicAppError,
} from "../shared/utils/appError";

export async function getCustomerAPMs(coreBaseUrl: string, publicApiKeyTonder: string, query: string = "?status=active&page_size=10000&country=México", signal:  AbortSignal | null | undefined = null) {
    const response = await fetch(
        `${coreBaseUrl}${API_ENDPOINTS.CORE_PAYMENT_METHODS}${query}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Token ${publicApiKeyTonder}`,
                'Content-Type': 'application/json'
            },
            signal
        });

    if (response.ok) return fromCorePaymentMethods(await response.json());
    throw await buildSupportError(response, ErrorKeyEnum.FETCH_PAYMENT_METHODS_ERROR, "core");
}
