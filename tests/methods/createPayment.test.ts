import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { IErrorResponse } from "../../src/types/responses";
import { constructorFields } from "../utils/defaultMock";
import { CreatePaymentResponseClass, CreatePaymentRequestClass } from "../utils/mockClasses";


declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("createPayment", () => {
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

    it("createPayment success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new CreatePaymentResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        });

        expect(response).toStrictEqual([{ ...new CreatePaymentResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith({
            ...new CreatePaymentRequestClass(),
        });
    });

    it("createPayment empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        });
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("createPayment errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        const response = (await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        })) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("createPayment errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createPayment");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.createPayment({
            ...new CreatePaymentRequestClass(),
        })) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});