import "../utils/defaultMock";
import Skyflow from "skyflow-js";
import { LiteCheckout } from "../../src";
import { ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { IErrorResponse } from "../../src/types/responses";
import { constructorFields } from "../utils/defaultMock";
import { TokensRequestClass } from "../utils/mockClasses";


declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("getSkyflowToken", () => {
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

    it("getSkyflowTokens success", async () => {
        liteCheckout.getVaultToken = jest
            .fn()
            .mockImplementation(() => Promise.resolve("1234"));

        liteCheckout.getFieldsPromise = jest
            .fn()
            .mockImplementation(() =>
                Promise.resolve(new Array(5).fill(Promise.resolve(true)))
            );

        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        const response = await liteCheckout.getSkyflowTokens({
            ...new TokensRequestClass(),
        });
        expect(response).toStrictEqual("1234");
        expect(liteCheckoutSpy).toHaveBeenCalled();
    });

    it("getSkyflowTokens empty", async () => {
        liteCheckout.getVaultToken = jest
            .fn()
            .mockImplementation(() => Promise.resolve(""));

        jest.spyOn(Skyflow, "init").mockImplementation(jest.fn().mockImplementation(() => ({
            container: () => ({
                collect: jest.fn().mockResolvedValue(""),
            }),
        })));

        liteCheckout.getFieldsPromise = jest
            .fn()
            .mockImplementation(() =>
                Promise.resolve(new Array(5).fill(Promise.resolve(true)))
            );

        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        let error: ErrorResponse;

        try {
            const response = await liteCheckout.getSkyflowTokens({
                ...new TokensRequestClass(),
            }) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error).toBeInstanceOf(ErrorResponse);
            expect(error.message).toStrictEqual("Por favor, verifica todos los campos de tu tarjeta");
        }
    });

    it("getSkyflowTokens error mount fields", async () => {
        liteCheckout.getVaultToken = jest
            .fn()
            .mockImplementation(() => Promise.resolve(""));

        jest.spyOn(Skyflow, "init").mockImplementation(jest.fn().mockImplementation(() => ({
            container: () => ({
                collect: jest.fn().mockResolvedValue(""),
            }),
        })));

        liteCheckout.getFieldsPromise = jest
            .fn()
            .mockImplementation(() =>
                new Array(5).fill(false)
            );

        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.getSkyflowTokens({
                ...new TokensRequestClass(),
            })) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error).toBeInstanceOf(ErrorResponse);
            expect(error.message).toStrictEqual("Ocurrió un error al montar los campos de la tarjeta");
        }
    });

    it("getSkyflowTokens error collect catch", async () => {
        liteCheckout.getVaultToken = jest
            .fn()
            .mockImplementation(() => Promise.resolve("1234"));

        jest.spyOn(Skyflow, "init").mockImplementation(jest.fn().mockImplementation(() => ({
            container: () => ({
                collect: jest.fn().mockRejectedValue("error"),
            }),
        })));

        liteCheckout.getFieldsPromise = jest
            .fn()
            .mockImplementation(() =>
                Promise.resolve(new Array(5).fill(Promise.resolve(true)))
            );

        liteCheckoutSpy = jest.spyOn(liteCheckout, "getSkyflowTokens");

        let error: ErrorResponse;

        try {
            const response = (await liteCheckout.getSkyflowTokens({
                ...new TokensRequestClass(),
            })) as IErrorResponse;
        } catch (e: any) {
            error = e;
            expect(error.message).toStrictEqual("error");
            expect(error).toBeInstanceOf(ErrorResponse);
        }
    });
});