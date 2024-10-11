import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { IErrorResponse } from "../../src/types/responses";
import { constructorFields } from "../utils/defaultMock";
import { StartCheckoutResponseClass, StartCheckoutFullRequestClass, BusinessClass, CustomerRegisterClass, OrderResponseClass, CreatePaymentResponseClass } from "../utils/mockClasses";
import {IInlineLiteCheckoutOptions} from "../../src/types/commons";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("startCheckoutRouterFull", () => {
    let checkoutConstructor: IInlineLiteCheckoutOptions,
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

    it("startCheckoutRouterFull success", async () => {

        liteCheckout.getBusiness = jest
        .fn()
        .mockImplementation(() => Promise.resolve({ ...new BusinessClass().mockObject }));

        liteCheckout.customerRegister = jest
        .fn()
        .mockImplementation(() => Promise.resolve({ ...new CustomerRegisterClass().mockObject }));

        liteCheckout.createOrder = jest
        .fn()
        .mockImplementation(() => Promise.resolve({ ...new OrderResponseClass().mockObject }));

        liteCheckout.createPayment = jest
        .fn()
        .mockImplementation(() => Promise.resolve({ ...new CreatePaymentResponseClass().mockObject }));

        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouterFull");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new StartCheckoutResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.startCheckoutRouterFull({ ...new StartCheckoutFullRequestClass().mockObject, });

        expect(response).toStrictEqual([{ ...new StartCheckoutResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
    });

    it("startCheckoutRouterFull empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouterFull");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.startCheckoutRouterFull({
                ...new StartCheckoutFullRequestClass().mockObject,
            })) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.code).toStrictEqual("500");
            expect(error).toBeInstanceOf(ErrorResponse);
        }

    });

    it("startCheckoutRouterFull errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouterFull");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.startCheckoutRouterFull({
                ...new StartCheckoutFullRequestClass(),
            })) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.code).toStrictEqual("400");
            expect(error).toBeInstanceOf(ErrorResponse);
        }
    });

    it("startCheckoutRouterFull errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouterFull");

        fetchSpy.mockRejectedValue("error");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.startCheckoutRouterFull({
                ...new StartCheckoutFullRequestClass(),
            })) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error.name).toStrictEqual("catch");
        }
        
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});