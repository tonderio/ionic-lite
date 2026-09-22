import { ThreeDSHandler } from "../src/classes/3dsHandler";
import { AppError } from "../src/shared/utils/appError";
import { ErrorKeyEnum } from "../src/shared/enum/ErrorKeyEnum";

const CHALLENGE_URL = "https://acs.example.com/challenge?id=42";
const IFRAME_ID = "tdsIframe";

const realLocation = Object.getOwnPropertyDescriptor(window, "location")!;

// jsdom's window.location has no setter, and a real assignment would navigate. Swapping
// in a plain data property records exactly what redirectToChallenge assigns to it.
function stubLocation(): { href: string } {
  const stub = { href: "http://localhost/" };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: stub,
  });
  return stub;
}

function buildHandler(url: string, redirectOnComplete: boolean): ThreeDSHandler {
  return new ThreeDSHandler({
    payload: {
      next_action: {
        redirect_to_url: {
          url,
          verify_transaction_status_url: "/api/v1/verify/42",
        },
      },
    },
    apiKey: "api-key",
    baseUrl: "https://stage.tonder.io",
    redirectOnComplete,
    tdsIframeId: IFRAME_ID,
  });
}

function mountIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.id = IFRAME_ID;
  document.body.appendChild(iframe);
  return iframe;
}

describe("ThreeDSHandler.redirectToChallenge", () => {
  beforeEach(() => {
    // Giving the iframe a src makes jsdom fire load, which drives the status poller.
    // Without a stub that call reaches an undefined global fetch and tears the worker
    // down before any assertion is reported.
    (global as any).fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ transaction_status: "Success" }),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", realLocation);
    document.body.innerHTML = "";
    localStorage.clear();
    delete (global as any).fetch;
  });

  describe("window.location sink", () => {
    it("navigates to a legitimate https challenge URL", () => {
      const stub = stubLocation();
      const handler = buildHandler(CHALLENGE_URL, true);

      handler.redirectToChallenge();

      expect(window.location as unknown as string).toBe(CHALLENGE_URL);
      expect(window.location).not.toBe(stub);
    });

    it("never assigns a javascript: URL to window.location", () => {
      const stub = stubLocation();
      const handler = buildHandler("javascript:alert(document.cookie)", true);

      expect(() => handler.redirectToChallenge()).toThrow(AppError);

      expect(window.location).toBe(stub);
    });
  });

  describe("iframe src sink", () => {
    it("points the iframe at a legitimate https challenge URL and reveals it", () => {
      const iframe = mountIframe();
      const handler = buildHandler(CHALLENGE_URL, false);

      handler.redirectToChallenge();

      expect(iframe.getAttribute("src")).toBe(CHALLENGE_URL);
      expect(iframe.getAttribute("style")).toBe("display: block");
    });

    it("never assigns a javascript: URL to the iframe src", () => {
      const iframe = mountIframe();
      const handler = buildHandler("javascript:alert(document.cookie)", false);

      expect(() => handler.redirectToChallenge()).toThrow(AppError);

      expect(iframe.getAttribute("src")).toBeNull();
      expect(iframe.getAttribute("style")).toBeNull();
    });
  });

  describe("rejection", () => {
    it("reports a 3DS redirection error the caller can surface", () => {
      stubLocation();
      const handler = buildHandler("javascript:alert(1)", true);

      try {
        handler.redirectToChallenge();
        throw new Error("expected redirectToChallenge to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorKeyEnum.THREEDS_REDIRECTION_ERROR);
      }
    });

    it("does not persist the verify transaction URL for a refused challenge", () => {
      stubLocation();
      const handler = buildHandler("javascript:alert(1)", true);

      expect(() => handler.redirectToChallenge()).toThrow(AppError);

      expect(handler.getVerifyTransactionUrl()).toBeNull();
    });

    it.each([
      ["leading whitespace", "   javascript:alert(1)"],
      ["mixed case", "JaVaScRiPt:alert(1)"],
      ["an embedded tab", "java\tscript:alert(1)"],
      ["an embedded newline", "java\nscript:alert(1)"],
      ["a comment that merely contains http", "javascript:/*http*/alert(1)"],
      ["a data: URL", "data:text/html,<script>alert(1)</script>"],
      ["a vbscript: URL", "vbscript:msgbox(1)"],
      ["a blob: URL", "blob:http://localhost/8f1c2b3a"],
      ["a file: URL", "file:///etc/passwd"],
    ])("refuses %s", (_label, url) => {
      const stub = stubLocation();
      const handler = buildHandler(url, true);

      expect(() => handler.redirectToChallenge()).toThrow(AppError);

      expect(window.location).toBe(stub);
    });
  });
});
