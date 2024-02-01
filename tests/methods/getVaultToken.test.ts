import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { constructorFields } from "../utils/defaultMock";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("getVaultToken", () => {
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

    it("getVaultToken success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve({ token: "1234" }),
                ok: true,
            })
        );

        const response = await liteCheckout.getVaultToken();
        expect(response).toStrictEqual("1234");
        expect(liteCheckoutSpy).toHaveBeenCalled();
    });

    it("getVaultToken empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: true,
            })
        );

        const response = await liteCheckout.getVaultToken();
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveReturned();
        expect(response).toBeUndefined();
    });

    it("getVaultToken errorResponse", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve(),
                ok: false,
                status: 400,
            })
        );

        try {
            await liteCheckout.getVaultToken();
        } catch (e) {
            const error = e as Error;
            expect(liteCheckoutSpy).toHaveBeenCalled();
            expect(liteCheckoutSpy).rejects.toThrow();
            expect(error.message).toStrictEqual(
                "Failed to retrieve bearer token; HTTPCODE: 400"
            );
            expect(error).toBeInstanceOf(Error);
        }
    });

    it("getVaultToken errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getVaultToken");

        fetchSpy.mockRejectedValue("error");

        try {
            await liteCheckout.getVaultToken();
        } catch (e) {
            const error = e as Error;
            expect(liteCheckoutSpy).toHaveBeenCalled();
            expect(liteCheckoutSpy).rejects.toThrow();
            expect(error.message).toStrictEqual(
                "Failed to retrieve bearer token; error"
            );
            expect(e).toBeInstanceOf(Error);
        }
    });
});