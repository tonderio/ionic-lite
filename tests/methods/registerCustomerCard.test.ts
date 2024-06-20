import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { constructorFields } from "../utils/defaultMock";
import { RegisterCustomerCardRequestClass, RegisterCustomerCardResponseClass } from "../utils/mockClasses";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { IErrorResponse } from "../../src/types/responses";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("registerCustomerCard", () => {
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

    it("registerCustomerCard success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "registerCustomerCard");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        ...new RegisterCustomerCardResponseClass(),
                    }),
                ok: true,
            })
        );

        const response = await liteCheckout.registerCustomerCard("1234", { ...new RegisterCustomerCardRequestClass() });

        expect(response).toStrictEqual({ ...new RegisterCustomerCardResponseClass() });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith("1234", { ...new RegisterCustomerCardRequestClass() });
    });

    it("registerCustomerCard empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "registerCustomerCard");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.registerCustomerCard("1234", { ...new RegisterCustomerCardRequestClass() });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("registerCustomerCard errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "registerCustomerCard");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.registerCustomerCard(
                "1234", { ...new RegisterCustomerCardRequestClass() }
            )) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.code).toStrictEqual("400");
            expect(error).toBeInstanceOf(ErrorResponse);
        }
    });

    it("registerCustomerCard errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "registerCustomerCard");

        fetchSpy.mockRejectedValue("error");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.registerCustomerCard(
                "1234", { ...new RegisterCustomerCardRequestClass() }
            )) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error.name).toStrictEqual("catch");
        }
        
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});