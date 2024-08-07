import { buildErrorResponse, buildErrorResponseFromCatch } from "../helpers/utils";

export async function getCustomerAPMs(baseUrlTonder: string, apiKeyTonder: string, query: string = "?status=active&page_size=10000&country=México", signal:  AbortSignal | null | undefined = null) {
    try {
        const response = await fetch(
            `${baseUrlTonder}/api/v1/payment_methods${query}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Token ${apiKeyTonder}`,
                    'Content-Type': 'application/json'
                },
                signal
            });

        if (response.ok) return await response.json();
        throw await buildErrorResponse(response);
    } catch (error) {
        throw buildErrorResponseFromCatch(error);
    }
}