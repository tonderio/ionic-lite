import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { IErrorResponse } from "../../src/types/responses";
import { constructorFields } from "../utils/defaultMock";
import { GetCustomerCardsResponseClass } from "../utils/mockClasses";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("getCustomerCards", () => {
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

        const response = await liteCheckout.getCustomerCards("1234", "1234");

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

        const response = await liteCheckout.getCustomerCards("1234", "1234");
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

        const response = (await liteCheckout.getCustomerCards(
            "1234", "1234"
        )) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("getCustomerCards errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getCustomerCards");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.getCustomerCards(
            "1234", "1234"
        )) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});