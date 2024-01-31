import "../utils/defaultMock";
import { LiteCheckout } from "../../src";
import { IErrorResponse, ErrorResponse } from "../../src/classes/errorResponse";
import { LiteCheckoutConstructor } from "../../src/classes/liteCheckout";
import { constructorFields } from "../utils/defaultMock";
import { OrderResponseClass, OrderItemClass } from "../utils/mockClasses";

  declare global {
      interface Window {
          OpenPay: any;
          Skyflow: any;
      }
  }
  
  describe("createOrder", () => {
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
  
  it("createOrder success", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockImplementation(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ ...new OrderResponseClass() }]),
                ok: true,
            })
        );

        const response = await liteCheckout.createOrder({
            ...new OrderItemClass(),
        });

        expect(response).toStrictEqual([{ ...new OrderResponseClass() }]);
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(liteCheckoutSpy).toHaveBeenCalledWith({ ...new OrderItemClass() });
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
            ...new OrderItemClass(),
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

        const response = (await liteCheckout.createOrder({
            ...new OrderItemClass(),
        })) as IErrorResponse;
        expect(response.code).toStrictEqual("400");
        expect(response).toBeInstanceOf(ErrorResponse);
    });

    it("createOrder errorCatch", async () => {
        liteCheckoutSpy = jest.spyOn(liteCheckout, "createOrder");

        fetchSpy.mockRejectedValue("error");

        const response = (await liteCheckout.createOrder({
            ...new OrderItemClass(),
        })) as IErrorResponse;
        expect(liteCheckoutSpy).toHaveBeenCalled();
        expect(response.message).toStrictEqual("error");
        expect(response.name).toStrictEqual("catch");
        expect(liteCheckoutSpy).rejects.toThrow();
    });
});