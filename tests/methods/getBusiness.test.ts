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
});


