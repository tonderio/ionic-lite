import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { IErrorResponse, ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { constructorFields } from "../utils/defaultMock";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("getOpenpayDeviceSessionID", () => {
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

    it("getOpenpayDeviceSessionID success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getOpenpayDeviceSessionID");

        window.OpenPay = {
            setId: jest.fn(),
            setApiKey: jest.fn(),
            setSandboxMode: jest.fn(),
            deviceData: {
                setup: jest.fn().mockImplementation(() => Promise.resolve("test")),
            },
        };

        expect(
            liteCheckout.getOpenpayDeviceSessionID("4321", "1234")
        ).resolves.toBe("test");
        expect(liteCheckoutSpy).toHaveBeenCalledWith("4321", "1234");
    });

    it("getOpenpayDeviceSessionID empty", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getOpenpayDeviceSessionID");

        window.OpenPay = {
            setId: jest.fn(),
            setApiKey: jest.fn(),
            setSandboxMode: jest.fn(),
            deviceData: {
                setup: jest.fn().mockImplementation(() => Promise.resolve()),
            },
        };

        expect(
            liteCheckout.getOpenpayDeviceSessionID("", "")
        ).resolves.toBeUndefined();
        expect(liteCheckoutSpy).toHaveBeenCalledWith("", "");
    });

    it("getOpenpayDeviceSessionID error", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "getOpenpayDeviceSessionID");

        window.OpenPay = {
            setId: jest.fn(),
            setApiKey: jest.fn(),
            setSandboxMode: jest.fn(),
            deviceData: {
                setup: jest.fn().mockRejectedValue("error"),
            },
        };

        try {
            await liteCheckout.getOpenpayDeviceSessionID("", "");
        } catch (e) {
            const error: IErrorResponse = e as IErrorResponse;
            expect(liteCheckoutSpy).toHaveBeenCalledWith("", "");
            expect(liteCheckoutSpy).toHaveReturned();
            expect(error.message).toStrictEqual("error");
            expect(error).toBeInstanceOf(ErrorResponse);
        }
    });
});