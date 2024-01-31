import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { IErrorResponse, ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { constructorFields } from "../utils/defaultMock";
import { BusinessClass } from "../utils/mockClasses";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("customerRegister", () => {
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
});