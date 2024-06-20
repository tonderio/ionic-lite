import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { IErrorResponse } from "../../src/types/responses";
import { constructorFields } from "../utils/defaultMock";
import { BusinessClass } from "../utils/mockClasses";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("getBusiness", () => {
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

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.getBusiness()) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.code).toStrictEqual("400");
            expect(error).toBeInstanceOf(ErrorResponse);
        }
    });

    it("getBusiness errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getBusiness");

        fetchSpy.mockRejectedValue("error");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.getBusiness()) as ErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error.name).toStrictEqual("catch");
        }

        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});


