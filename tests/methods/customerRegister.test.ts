import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { constructorFields } from "../utils/defaultMock";
import { CustomerRegisterClass } from "../utils/mockClasses";
import {IInlineLiteCheckoutOptions} from "../../src/types/commons";


declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("customerRegister", () => {
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

    it("customerRegister success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "customerRegister");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        ...new CustomerRegisterClass(),
                    }),
                ok: true,
            })
        );

        const response = await liteCheckout.customerRegister("email@gmail.com");

        expect(response).toStrictEqual({ ...new CustomerRegisterClass() });
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
        
        let error: ErrorResponse;

        try {
            const response = await liteCheckout.customerRegister(
                "email@gmail.com"
            )
        } catch (e: any) {
            error = e;
            expect(error.code).toStrictEqual("400");
            expect(error).toBeInstanceOf(ErrorResponse);
        }

    });

    it("customerRegister errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "customerRegister");

        fetchSpy.mockRejectedValue("error");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.customerRegister(
                "email@gmail.com"
            )) as ErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error.name).toStrictEqual("catch");
        }

        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});