import { ThreeDSHandler } from "../src/classes/3dsHandler";
import { LiteCheckout } from "../src/classes/liteCheckout";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const API_KEY = "merchant-api-key";
const LEGACY_BASE = "https://stage.tonder.io";
const CORE_BASE = "https://api-stage.tonder.io";
const STORAGE_KEY = "verify_transaction_status_url";

const CORE_VERIFY_PATH = "/transactions/v1/0192b8a0-0000-7000-8000-000000000001";
const LEGACY_VERIFY_PATH = "/api/v1/tonder/ksk/business/7/payments/55/transactions/9";

// Stands for the rebuilt checkout-router body the SDK hands back for a core payment.
const buildCoreResult = (transaction: Record<string, any>) => ({
  rebuilt: true,
  transaction_status: transaction.status,
});

function buildHandler(): ThreeDSHandler {
  return new ThreeDSHandler({
    apiKey: API_KEY,
    baseUrl: LEGACY_BASE,
    coreBaseUrl: CORE_BASE,
    redirectOnComplete: true,
    buildCoreResult,
  });
}

function payloadWithVerifyUrl(url: string) {
  return {
    next_action: {
      redirect_to_url: {
        url: "https://payflow.example.com/process?token=t",
        return_url: "https://shop.example.com/done",
        verify_transaction_status_url: url,
      },
    },
  };
}

function stored(): Record<string, any> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!);
}

function storeItem(item: Record<string, unknown>) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ expires: Date.now() + 60_000, ...item }),
  );
}

function jsonResponse(body: unknown, status = 200) {
  return { status, ok: status < 400, json: async () => body };
}

const RAIL_SUCCESS = {
  id: 9,
  provider: "tonder",
  status: "Success",
  transaction_status: "Success",
  amount: "100.00",
};

describe("3DS state keeps the engine of its payment", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it("stores the engine next to the verify URL", () => {
    const handler = buildHandler();
    handler.setEngine("core");
    handler.setPayload(payloadWithVerifyUrl(CORE_VERIFY_PATH));

    handler.saveVerifyTransactionUrl();

    expect(stored()).toMatchObject({ url: CORE_VERIFY_PATH, engine: "core" });
  });

  it("stores a legacy payment as legacy by default", () => {
    const handler = buildHandler();
    handler.setPayload(payloadWithVerifyUrl(LEGACY_VERIFY_PATH));

    handler.saveVerifyTransactionUrl();

    expect(stored()).toMatchObject({ url: LEGACY_VERIFY_PATH, engine: "legacy" });
  });

  it("reads the engine back on a new instance, after the page reloaded", () => {
    const first = buildHandler();
    first.setEngine("core");
    first.setPayload(payloadWithVerifyUrl(CORE_VERIFY_PATH));
    first.saveVerifyTransactionUrl();

    expect(buildHandler().getStoredEngine()).toBe("core");
  });

  it("treats a state stored before the engine existed as legacy", () => {
    storeItem({ url: LEGACY_VERIFY_PATH });

    expect(buildHandler().getStoredEngine()).toBe("legacy");
  });

  it("verifies a legacy payment against the monolith, as before", async () => {
    storeItem({ url: LEGACY_VERIFY_PATH });
    fetchMock.mockResolvedValue(jsonResponse(RAIL_SUCCESS));

    const result = await buildHandler().verifyTransactionStatus();

    expect(fetchMock.mock.calls[0][0]).toBe(`${LEGACY_BASE}${LEGACY_VERIFY_PATH}`);
    expect(result).toEqual(RAIL_SUCCESS);
  });

  it("verifies a core payment with one GET to the core and the same credential", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(
      jsonResponse({ id: "0192b8a0-0000-7000-8000-000000000001", status: "Success" }),
    );

    const result = await buildHandler().verifyTransactionStatus();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${CORE_BASE}${CORE_VERIFY_PATH}`);
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe(`Token ${API_KEY}`);
    expect(result).toEqual({ rebuilt: true, transaction_status: "Success" });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it.each(["Declined", "Failed", "Authorized"])(
    "clears the state once a core payment is %s",
    async (status) => {
      storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
      fetchMock.mockResolvedValue(jsonResponse({ id: "x", status }));

      const result = await buildHandler().verifyTransactionStatus();

      expect(result).toEqual({ rebuilt: true, transaction_status: status });
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    },
  );

  it.each(["Pending", "Processing"])(
    "keeps the verification state while a core payment is still %s",
    async (status) => {
      storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
      fetchMock.mockResolvedValue(jsonResponse({ id: "x", status }));

      const result = await buildHandler().verifyTransactionStatus();

      expect(result).toEqual({ rebuilt: true, transaction_status: status });
      expect(stored()).toMatchObject({ url: CORE_VERIFY_PATH, engine: "core" });
    },
  );

  it("decides open or final by the core's status, not by the rail's transaction_status", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(
      jsonResponse({ id: "x", status: "Success", transaction_status: "Pending" }),
    );
    await buildHandler().verifyTransactionStatus();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(
      jsonResponse({ id: "x", status: "Processing", transaction_status: "Declined" }),
    );
    await buildHandler().verifyTransactionStatus();
    expect(stored()).toMatchObject({ engine: "core" });
  });

  it.each([500, 502, 503, 504, 429, 408])(
    "keeps the core verification state after a transient %s and rejects with the status",
    async (status) => {
      storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
      fetchMock.mockResolvedValue(jsonResponse({}, status));

      await expect(buildHandler().verifyTransactionStatus()).rejects.toMatchObject({
        code: ErrorKeyEnum.FETCH_TRANSACTION_ERROR,
        statusCode: status,
      });

      expect(stored()).toMatchObject({ url: CORE_VERIFY_PATH, engine: "core" });
    },
  );

  it.each([400, 401, 403, 404])(
    "clears the core verification state after a %s: the payment cannot be read",
    async (status) => {
      storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
      fetchMock.mockResolvedValue(jsonResponse({}, status));

      await expect(buildHandler().verifyTransactionStatus()).rejects.toMatchObject({
        code: ErrorKeyEnum.FETCH_TRANSACTION_ERROR,
        statusCode: status,
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    },
  );

  it("keeps the core verification state after a network error and rejects", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(buildHandler().verifyTransactionStatus()).rejects.toMatchObject({
      code: ErrorKeyEnum.FETCH_TRANSACTION_ERROR,
    });

    expect(stored()).toMatchObject({ engine: "core" });
  });

  it("still answers a legacy payment's refused verify with the raw response and clears the state", async () => {
    storeItem({ url: LEGACY_VERIFY_PATH });
    const refused = jsonResponse({}, 500);
    fetchMock.mockResolvedValue(refused);

    await expect(buildHandler().verifyTransactionStatus()).resolves.toBe(refused);

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("still answers undefined and clears the state of a legacy payment after a network error", async () => {
    storeItem({ url: LEGACY_VERIFY_PATH });
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(buildHandler().verifyTransactionStatus()).resolves.toBeUndefined();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("stops the iframe poller on the core's final status only", () => {
    const core = buildHandler();
    core.setEngine("core");
    const legacy = buildHandler();

    expect(core.isVerificationFinal({ status: "Processing", transaction_status: "Declined" })).toBe(false);
    expect(core.isVerificationFinal({ status: "Pending" })).toBe(false);
    expect(core.isVerificationFinal({ status: "Success", transaction_status: "Pending" })).toBe(true);
    expect(legacy.isVerificationFinal({ transaction_status: "Processing" })).toBe(true);
    expect(legacy.isVerificationFinal({ transaction_status: "Pending" })).toBe(false);
  });

  it.each([502, 429])("keeps the iframe poller of a core payment going after a %s", async (status) => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(jsonResponse({}, status));
    const handler = buildHandler();
    handler.setEngine("core");

    const polled = await handler.requestTransactionStatus();

    expect(handler.isVerificationFinal(polled)).toBe(false);
  });

  it("keeps the poller going when a core answer is not JSON", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });
    const handler = buildHandler();

    const polled = await handler.requestTransactionStatus();

    expect(handler.isVerificationFinal(polled)).toBe(false);
  });

  it("keeps polling under either rule, whatever engine the handler has meanwhile", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(jsonResponse({}, 503));
    const handler = buildHandler();

    const polled = await handler.requestTransactionStatus();

    handler.setEngine("legacy");
    expect(handler.isVerificationFinal(polled)).toBe(false);
    handler.setEngine("core");
    expect(handler.isVerificationFinal(polled)).toBe(false);
  });

  it("stops the iframe poller of a core payment after a 404", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(jsonResponse({}, 404));

    await expect(buildHandler().requestTransactionStatus()).resolves.toBeNull();
  });

  it("authenticates a core verify with the deprecated apiKeyTonder when it is the only key", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(jsonResponse({ id: "x", status: "Success" }));
    const checkout = new LiteCheckout({ mode: "stage", apiKeyTonder: "deprecated-key" } as any);

    await checkout.process3ds.verifyTransactionStatus();

    expect(fetchMock.mock.calls[0][0]).toBe(`${CORE_BASE}${CORE_VERIFY_PATH}`);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Token deprecated-key");
  });

  it("still clears the state of a legacy payment that answers Pending, as before", async () => {
    storeItem({ url: LEGACY_VERIFY_PATH });
    fetchMock.mockResolvedValue(jsonResponse({ status: "Pending" }));

    await buildHandler().verifyTransactionStatus();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("polls a core payment's status against the core and answers the payment as the core has it", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    fetchMock.mockResolvedValue(jsonResponse({ id: "x", status: "Success" }));

    const polled = await buildHandler().requestTransactionStatus();

    expect(fetchMock.mock.calls[0][0]).toBe(`${CORE_BASE}${CORE_VERIFY_PATH}`);
    expect(polled).toEqual({ id: "x", status: "Success" });
  });

  it("keeps an absolute verify URL as it is", async () => {
    storeItem({ url: `https://other.example.com${CORE_VERIFY_PATH}`, engine: "core" });
    fetchMock.mockResolvedValue(jsonResponse({ id: "x", status: "Success" }));

    await buildHandler().requestTransactionStatus();

    expect(fetchMock.mock.calls[0][0]).toBe(`https://other.example.com${CORE_VERIFY_PATH}`);
  });
});

describe("verify3dsTransaction after the buyer returns", () => {
  it("resolves a core payment with the monolith's transaction object, not the checkout-router body", async () => {
    localStorage.clear();
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        id: "x",
        operation_type: "payment",
        status: "Success",
        amount: "10.0000",
        currency: "MXN",
        created_at: "2026-11-18T10:00:00Z",
        updated_at: "2026-11-18T10:00:01Z",
        transaction_id: "7",
      }),
    );
    (global as any).fetch = fetchMock;
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });

    const result: any = await new LiteCheckout({ mode: "stage", apiKey: API_KEY }).verify3dsTransaction();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ id: 7, status: "Success", transaction_status: "Success", currency_code: "MXN" });
    for (const body of ["actions", "is_route_finished", "message", "next_action", "payment_id", "transaction_id"]) {
      expect(result).not.toHaveProperty(body);
    }
  });

  let fetchMock: jest.Mock;
  let checkout: LiteCheckout;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    checkout = new LiteCheckout({ mode: "stage", apiKey: API_KEY });
  });

  it("does not send the buyer back to a challenge already used by a still-open core payment", async () => {
    storeItem({ url: CORE_VERIFY_PATH, engine: "core" });
    const open = {
      id: "x",
      status: "Pending",
      next_action: {
        redirect_to_url: {
          url: "https://payflow.example.com/process?token=t",
          verify_transaction_status_url: CORE_VERIFY_PATH,
        },
      },
    };
    fetchMock.mockResolvedValue(jsonResponse(open));
    const realLocation = Object.getOwnPropertyDescriptor(window, "location")!;
    const location = { href: "https://localhost/" };
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: location });

    try {
      const result = await checkout.verify3dsTransaction();

      expect(result).toMatchObject({ status: "Pending", transaction_status: "Pending" });
      expect(result).not.toHaveProperty("next_action");
      expect(window.location).toBe(location);
      expect(location.href).toBe("https://localhost/");
      expect(stored()).toMatchObject({ url: CORE_VERIFY_PATH, engine: "core" });
    } finally {
      Object.defineProperty(window, "location", realLocation);
    }
  });

  it("stores a challenge found while resuming a legacy payment under the legacy engine", async () => {
    storeItem({ url: LEGACY_VERIFY_PATH });
    checkout.process3ds.setEngine("core");
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: "Declined", transaction_status: "Declined", checkout_id: "chk-1" }),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          transaction_status: "Pending",
          next_action: {
            redirect_to_url: {
              url: "https://acs.example.com/challenge",
              verify_transaction_status_url: LEGACY_VERIFY_PATH,
            },
          },
        }),
      });
    const realLocation = Object.getOwnPropertyDescriptor(window, "location")!;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "https://localhost/" },
    });

    try {
      await checkout.verify3dsTransaction();

      expect(stored()).toMatchObject({ url: LEGACY_VERIFY_PATH, engine: "legacy" });
    } finally {
      Object.defineProperty(window, "location", realLocation);
    }
  });

  it("does not leave a failed verification of the iframe branch unhandled", async () => {
    const failure = new Error("core unavailable");
    jest.spyOn(checkout.process3ds, "loadIframe").mockResolvedValue(true);
    jest.spyOn(checkout.process3ds, "verifyTransactionStatus").mockRejectedValue(failure);
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);
    const payload = { next_action: { iframe_resources: { iframe: "<form></form>" } } };

    await checkout._handle3dsRedirect(payload as any);
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("still resumes a declined legacy payment through checkout-router", async () => {
    storeItem({ url: LEGACY_VERIFY_PATH });
    const declined = {
      status: "Declined",
      transaction_status: "Declined",
      checkout_id: "chk-1",
      is_route_finished: false,
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(declined))
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => RAIL_SUCCESS });

    await checkout.verify3dsTransaction();

    expect(fetchMock.mock.calls[0][0]).toBe(`${LEGACY_BASE}${LEGACY_VERIFY_PATH}`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${LEGACY_BASE}/api/v1/checkout-router/`);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ checkout_id: "chk-1" });
  });
});
