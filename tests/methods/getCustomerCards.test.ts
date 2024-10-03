import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { constructorFields } from "../utils/defaultMock";
import { GetCustomerCardsResponseClass } from "../utils/mockClasses";
import {IInlineLiteCheckoutOptions} from "../../src/types/commons";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("getCustomerCards", () => {
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

    it("getCustomerCards success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getCustomerCards");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        ...new GetCustomerCardsResponseClass(),
                    }),
                ok: true,
            })
        );

        const response = await liteCheckout.getCustomerCards();

        expect(response).toStrictEqual({ ...new GetCustomerCardsResponseClass() });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith("1234", "1234");
    });

    it("getCustomerCards empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getCustomerCards");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.getCustomerCards();
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("getCustomerCards errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getCustomerCards");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );
        
        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.getCustomerCards());
        } catch (e: any) {
            error = e;
            expect(error.code).toStrictEqual("400");
            expect(error).toBeInstanceOf(ErrorResponse);
        }
    });

    it("getCustomerCards errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getCustomerCards");

        fetchSpy.mockRejectedValue("error");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.getCustomerCards());
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error.name).toStrictEqual("catch");
        }

        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});