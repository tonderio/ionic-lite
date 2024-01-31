jest.setMock("skyflow-js", {
    OpenPay: jest.fn(),
    init: jest.fn().mockImplementation(() => ({ container: () => jest.fn() })),
    LogLevel: { ERROR: "ERROR" },
    Env: { DEV: "DEV" },
    ContainerType: { COLLECT: "COLLECT" },
    container: () => jest.fn(),
});

import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { LiteCheckout } from "../../src";
import {
    Business,
    CreateOrderResponse,
    CreatePaymentRequest,
    CreatePaymentResponse,
    Customer,
    OrderItem,
    StartCheckoutRequest,
    StartCheckoutResponse,
} from "../../src/types/commons";
import { ErrorResponse, IErrorResponse } from "../../src/classes/ErrorResponse";
import { TokensRequest } from "../../src/types/skyflow";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

class BusinessClass implements Business {
    business!: {
        pk: number;
        name: string;
        categories: [{ pk: number; name: string }];
        web: string;
        logo: string;
        full_logo_url: string;
        background_color: string;
        primary_color: string;
        checkout_mode: boolean;
        textCheckoutColor: string;
        textDetailsColor: string;
        checkout_logo: string;
    };
    openpay_keys!: { merchant_id: string; public_key: string };
    fintoc_keys!: { public_key: string };
    vault_id!: string;
    vault_url!: string;
    reference!: number;
    is_installments_available!: boolean;
}

class OrderItemClass implements OrderItem {
    description!: string;
    quantity!: number;
    price_unit!: number;
    discount!: number;
    taxes!: number;
    product_reference!: number;
    name!: string;
    amount_total!: number;
}

class OrderResponseClass implements CreateOrderResponse {
    id!: number;
    created!: string;
    amount!: string;
    status!: string;
    payment_method?: string | undefined;
    reference?: string | undefined;
    is_oneclick!: boolean;
    items!: [
        {
            description: string;
            product_reference: string;
            quantity: string;
            price_unit: string;
            discount: string;
            taxes: string;
            amount_total: string;
        }
    ];
    billing_address?: string | undefined;
    shipping_address?: string | undefined;
    client!: {
        email: string;
        name: string;
        first_name: string;
        last_name: string;
        client_profile: {
            gender: string;
            date_birth?: string | undefined;
            terms: boolean;
            phone: string;
        };
    };
}

class CreatePaymentRequestClass implements CreatePaymentRequest {
    business_pk!: string;
}

class CreatePaymentResponseClass implements CreatePaymentResponse {
    pk!: number;
    order?: string | undefined;
    amount!: string;
    status!: string;
    date!: string;
    paid_date?: string | undefined;
    shipping_address!: {
        street: string;
        number: string;
        suburb: string;
        city: { name: string };
        state: { name: string; country: { name: string } };
        zip_code: string;
    };
    shipping_address_id?: string | undefined;
    billing_address!: {
        street: string;
        number: string;
        suburb: string;
        city: { name: string };
        state: { name: string; country: { name: string } };
        zip_code: string;
    };
    billing_address_id?: string | undefined;
    client?: string | undefined;
    customer_order_reference?: string | undefined;
}

class StartCheckoutRequestClass implements StartCheckoutRequest {
    card: any;
    name: any;
    last_name!: string;
    email_client: any;
    phone_number: any;
    return_url!: string;
    id_product!: string;
    quantity_product!: number;
    id_ship!: string;
    instance_id_ship!: string;
    amount: any;
    title_ship!: string;
    description!: string;
    device_session_id: any;
    token_id!: string;
    order_id: any;
    business_id: any;
    payment_id: any;
    source!: string;
}

class StartCheckoutResponseClass implements StartCheckoutResponse {
    status!: number;
    message!: string;
    psp_response!: {
        id: string;
        authorization: number;
        operation_type: string;
        transaction_type: string;
        status: string;
        conciliated: boolean;
        creation_date: string;
        operation_date: string;
        description: string;
        error_message?: string;
        order_id?: string;
        card: {
            type: string;
            brand: string;
            address?: string;
            card_number: string;
            holder_name: string;
            expiration_year: string;
            expiration_month: string;
            allows_charges: boolean;
            allows_payouts: boolean;
            bank_name: string;
            points_type: string;
            points_card: boolean;
            bank_code: number;
        };
        customer_id: string;
        gateway_card_present: string;
        amount: number;
        fee: {
            amount: number;
            tax: number;
            currency: string;
        };
        payment_method: {
            type: string;
            url: string;
        };
        currency: string;
        method: string;
        object: string;
    };
    transaction_status!: string;
    transaction_id!: number;
    payment_id!: number;
    provider!: string;
    next_action!: {
        redirect_to_url: {
            url: string;
            return_url: string;
            verify_transaction_status_url: string;
        };
    };
    actions!: [
        {
            name: string;
            url: string;
            method: string;
        }
    ];
}

class TokensRequestClass implements TokensRequest {
    vault_id!: string;
    vault_url!: string;
    data: { [key: string]: any } = {};
}

export type PaymentData = {
    customer: Customer;
    cart: {
        total: string | number;
        items: OrderItem[];
    };
};

describe("LiteCheckout", () => {
    const abortSignal = new AbortController().signal;

    const constructorFields = {
        signal: abortSignal,
        baseUrlTonder: "",
        apiKeyTonder: "",
    };

    let checkoutConstructor: LiteCheckoutConstructor,
        liteCheckout: LiteCheckout,
        fetchSpy: jest.SpyInstance,
        liteCheckoutSpy: jest.SpyInstance;

    beforeEach(async () => {
        window.fetch = jest.fn();

        checkoutConstructor = {
            ...constructorFields,
        };

        liteCheckout = new LiteCheckout(constructorFields);

        fetchSpy = jest.spyOn(global, "fetch");
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("Has required properties", () => {
        expect(checkoutConstructor).toEqual(constructorFields);
    });

    it("Can instance LiteCheckout", () => {
        expect(liteCheckout).toBeInstanceOf(LiteCheckout);
        expect(liteCheckout.apiKeyTonder).toEqual(constructorFields.apiKeyTonder);
        expect(liteCheckout.baseUrlTonder).toEqual(constructorFields.baseUrlTonder);
        expect(liteCheckout.signal).toEqual(constructorFields.signal);
    });

    it("getOpenpayDeviceSessionID success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getOpenpayDeviceSessionID");

        window.OpenPay = {
            setId: jest.fn(),
            setApiKey: jest.fn(),
            setSandboxMode: jest.fn(),
            deviceData: {
                setup: jest.fn().mockImplementation(() => Promise.resolve("test")),
            },
        };

        expect(
            liteCheckout.getOpenpayDeviceSessionID("4321", "1234")
        ).resolves.toBe("test");
        expect(liteCheckoutSpy).toHaveBeenCalledWith("4321", "1234");
    });

    it("getOpenpayDeviceSessionID empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getOpenpayDeviceSessionID");

        window.OpenPay = {
            setId: jest.fn(),
            setApiKey: jest.fn(),
            setSandboxMode: jest.fn(),
            deviceData: {
                setup: jest.fn().mockImplementation(() => Promise.resolve()),
            },
        };

        expect(
            liteCheckout.getOpenpayDeviceSessionID("", "")
        ).resolves.toBeUndefined();
        expect(liteCheckoutSpy).toHaveBeenCalledWith("", "");
    });

    it("getOpenpayDeviceSessionID error", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getOpenpayDeviceSessionID");

        window.OpenPay = {
            setId: jest.fn(),
            setApiKey: jest.fn(),
            setSandboxMode: jest.fn(),
            deviceData: {
                setup: jest.fn().mockRejectedValue("error"),
            },
        };

        try {
            await liteCheckout.getOpenpayDeviceSessionID("", "");
        } catch (e) {
            const error: IErrorResponse = e as IErrorResponse;
            expect(liteCheckoutSpy).toHaveBeenCalledWith("", "");
            expect(liteCheckoutSpy).toHaveReturned();
            expect(error.message).toStrictEqual("error");
            expect(error).toBeInstanceOf(ErrorResponse);
        }
    });

    it("getBusiness success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getBusiness");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        ...new BusinessClass(),
                    }),
                ok: true,
            })
        );

        const response = await liteCheckout.getBusiness();

        expect(response).toStrictEqual({ ...new BusinessClass() });
        expect(liteCheckoutSpy).toHaveBeenCalled();
    });

    it("getBusiness empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getBusiness");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.getBusiness();
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("getBusiness errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getBusiness");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        const response = (await liteCheckout.getBusiness()) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("getBusiness errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getBusiness");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.getBusiness()) as ErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });

    it("customerRegister success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "customerRegister");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        ...new BusinessClass(),
                    }),
                ok: true,
            })
        );

        const response = await liteCheckout.customerRegister("email@gmail.com");

        expect(response).toStrictEqual({ ...new BusinessClass() });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith("email@gmail.com");
    });

    it("customerRegister empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "customerRegister");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.customerRegister("email@gmail.com");
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("customerRegister errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "customerRegister");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        const response = (await liteCheckout.customerRegister(
            "email@gmail.com"
        )) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("customerRegister errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "customerRegister");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.customerRegister(
            "email@gmail.com"
        )) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });

    it("createOrder success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new OrderResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.createOrder({
            ...new OrderItemClass(),
        });

        expect(response).toStrictEqual([{ ...new OrderResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith({ ...new OrderItemClass() });
    });

    it("createOrder empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.createOrder({
            ...new OrderItemClass(),
        });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("createOrder errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        const response = (await liteCheckout.createOrder({
            ...new OrderItemClass(),
        })) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("createOrder errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.createOrder({
            ...new OrderItemClass(),
        })) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });

    it("createPayment success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new CreatePaymentResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        });

        expect(response).toStrictEqual([{ ...new CreatePaymentResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith({
            ...new CreatePaymentRequestClass(),
        });
    });

    it("createPayment empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("createPayment errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        const response = (await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        })) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("createPayment errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        })) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });

    it("startCheckoutRouter success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouter");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new StartCheckoutResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.startCheckoutRouter({
            ...new StartCheckoutRequestClass(),
        });
        expect(response).toStrictEqual([{ ...new StartCheckoutResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith({
            ...new CreatePaymentRequestClass(),
        });
    });

    it("startCheckoutRouter empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouter");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.startCheckoutRouter({
            ...new StartCheckoutRequestClass(),
        });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("startCheckoutRouter errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouter");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        const response = (await liteCheckout.startCheckoutRouter({
            ...new StartCheckoutRequestClass(),
        })) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("startCheckoutRouter errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouter");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.startCheckoutRouter({
            ...new StartCheckoutRequestClass(),
        })) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });

    it("getVaultToken success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve({ token: "1234" }),
                ok: true,
            })
        );

        const response = await liteCheckout.getVaultToken();
        expect(response).toStrictEqual("1234");
        expect(liteCheckoutSpy).toHaveBeenCalled();
    });

    it("getVaultToken empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.getVaultToken();
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("getVaultToken errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        try {
            await liteCheckout.getVaultToken();
        } catch (e) {
            const error = e as Error;
            expect(liteCheckoutSpy).toHaveBeenCalled();
            expect(liteCheckoutSpy).rejects.toThrow();
            expect(error.message).toStrictEqual(
                "Failed to retrieve bearer token; HTTPCODE: 400"
            );
            expect(error).toBeInstanceOf(Error);
        }
    });

    it("getVaultToken errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockRejectedValue("error");

        try {
            await liteCheckout.getVaultToken();
        } catch (e) {
            const error = e as Error;
            expect(liteCheckoutSpy).toHaveBeenCalled();
            expect(liteCheckoutSpy).rejects.toThrow();
            expect(error.message).toStrictEqual(
                "Failed to retrieve bearer token; error"
            );
            expect(e).toBeInstanceOf(Error);
        }
    });

    it("getSkyflowTokens success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve({ token: "1234" }),
                ok: true,
            })
        );

        const response = await liteCheckout.getSkyflowTokens({
            ...new TokensRequestClass(),
        });
        expect(response).toStrictEqual("1234");
        expect(liteCheckoutSpy).toHaveBeenCalled();
    });

    it("getSkyflowTokens empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.getSkyflowTokens({
            ...new TokensRequestClass(),
        });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("getSkyflowTokens errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        const response = (await liteCheckout.getSkyflowTokens({
            ...new TokensRequestClass(),
        })) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("getSkyflowTokens errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        jest
            .spyOn(liteCheckout, "getVaultToken")
            .mockImplementation(() => Promise.resolve("1234"));

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.getSkyflowTokens({
            ...new TokensRequestClass(),
        })) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});
