import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { IErrorResponse } from "../../src/types/responses";
import { constructorFields } from "../utils/defaultMock";
import { StartCheckoutResponseClass, StartCheckoutRequestClass, CreatePaymentRequestClass } from "../utils/mockClasses";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("startCheckoutRouter", () => {
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
});