import { ThreeDSHandler } from "../src/classes/3dsHandler";

const STORAGE_KEY = "verify_transaction_status_url";

function buildHandler() {
  return new ThreeDSHandler({ apiKey: "key", baseUrl: "https://stage.tonder.io" });
}

describe("polling the verification status without stored state", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it("answers null instead of throwing when nothing is stored", async () => {
    await expect(buildHandler().requestTransactionStatus()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers null instead of throwing when the stored state expired", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: "/api/v1/x", expires: Date.now() - 1000 }),
    );

    await expect(buildHandler().requestTransactionStatus()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still polls the stored URL", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: "/api/v1/x", expires: Date.now() + 60_000 }),
    );
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({ transaction_status: "Success" }) });

    await expect(buildHandler().requestTransactionStatus()).resolves.toEqual({
      transaction_status: "Success",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://stage.tonder.io/api/v1/x");
  });
});
