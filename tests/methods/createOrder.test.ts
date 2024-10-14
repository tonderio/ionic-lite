import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { constructorFields } from "../utils/defaultMock";
import { OrderResponseClass, OrderClass, OrderEmptyValuesResponse } from "../utils/mockClasses";
import {IInlineLiteCheckoutOptions} from "../../src/types/commons";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("createOrder", () => {
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

    it("createOrder success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new OrderResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.createOrder({
            ...new OrderClass(),
        });

        expect(response).toStrictEqual([{ ...new OrderResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith({ ...new OrderClass() });
    });

    it("createOrder empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.createOrder({
            ...new OrderClass(),
        });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("createOrder errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );
        
        let error;

        try {
            const response = await liteCheckout.createOrder({
                ...new OrderClass(),
            })
        } catch (e) {
            error = e;
        }
        
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(error).toBeInstanceOf(ErrorResponse);
    });

    it("createOrder empty values", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(OrderEmptyValuesResponse),
                ok: false,
                status: 400,
            })
        );

        let error: ErrorResponse;
        
        try {
            const response = (await liteCheckout.createOrder({
                ...new OrderClass(),
            })) as ErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.body).toStrictEqual(OrderEmptyValuesResponse);
        }
    });

    it("createOrder errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockRejectedValue("error");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.createOrder({
                ...new OrderClass(),
            })) as ErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error.name).toStrictEqual("catch");
        }

        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});