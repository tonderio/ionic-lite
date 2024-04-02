import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { IErrorResponse } from "../../src/types/responses";
import { constructorFields } from "../utils/defaultMock";
import { StartCheckoutResponseClass, StartCheckoutFullRequestClass } from "../utils/mockClasses";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("startCheckoutRouterFull", () => {
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

    it("startCheckoutRouterFull success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouterFull");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new StartCheckoutResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.startCheckoutRouterFull({ ...new StartCheckoutFullRequestClass(), });

        expect(response).toStrictEqual([{ ...new StartCheckoutResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith({
            ...new StartCheckoutResponseClass(),
        });
    });

    it("startCheckoutRouterFull empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "startCheckoutRouterFull");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.startCheckoutRouterFull({
            ...new StartCheckoutFullRequestClass(),
        });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
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