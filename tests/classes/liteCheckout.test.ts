import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { constructorFields } from "../utils/defaultMock";
import {IInlineLiteCheckoutOptions} from "../../src/types/commons";

declare global {
    interface Window {
        OpenPay: any;
        Skyflow: any;
    }
}

describe("LiteCheckout", () => {
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

    it("Has required properties", () => {
        expect(checkoutConstructor).toEqual(constructorFields);
    });

    it("Can instance LiteCheckout", () => {
        expect(liteCheckout).toBeInstanceOf(LiteCheckout);
        expect(liteCheckout.apiKeyTonder).toEqual(constructorFields.apiKey);
        expect(liteCheckout.baseUrl).toEqual(constructorFields.baseUrl);
        expect(liteCheckout.abortController.signal).toEqual(constructorFields.signal);
    });





 






});
