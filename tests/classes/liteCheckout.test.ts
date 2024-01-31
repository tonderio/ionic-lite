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

describe("LiteCheckout", () => {
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

    it("Has required properties", () => {
        expect(checkoutConstructor).toEqual(constructorFields);
    });

    it("Can instance LiteCheckout", () => {
        expect(liteCheckout).toBeInstanceOf(LiteCheckout);
        expect(liteCheckout.apiKeyTonder).toEqual(constructorFields.apiKeyTonder);
        expect(liteCheckout.baseUrlTonder).toEqual(constructorFields.baseUrlTonder);
        expect(liteCheckout.signal).toEqual(constructorFields.signal);
    });





 






});
