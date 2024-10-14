import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { constructorFields } from "../utils/defaultMock";
import { BusinessClass } from "../utils/mockClasses";
import {IInlineLiteCheckoutOptions} from "../../src/types/commons";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("getBusiness", () => {
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
            const response = (await liteCheckout.getBusiness());
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
            const response = (await liteCheckout.getBusiness());
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error.name).toStrictEqual("catch");
        }

        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});


