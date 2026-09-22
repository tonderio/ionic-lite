import { ThreeDSHandler } from "../src/classes/3dsHandler";
import { sanitize3dsMarkup } from "../src/helpers/sanitize3dsMarkup";

// Shape of the markup the ACS returns for the 3DS Method step: a hidden form plus the
// iframe it targets. The flow depends on both surviving sanitization.
const THREE_DS_METHOD_MARKUP = `
  <iframe id="tdsMmethodTgtFrame" name="tdsMmethodTgtFrame" style="display: none"></iframe>
  <form id="tdsMmethodForm" name="tdsMmethodForm" target="tdsMmethodTgtFrame"
        action="https://acs.example.com/3ds-method" method="POST">
    <input type="hidden" name="threeDSMethodData" value="eyJ0aHJlZURTTWV0aG9kTm90aWZpY2F0aW9uVVJMIjoiIn0" />
  </form>
`;

function buildHandler(iframe: string): ThreeDSHandler {
  return new ThreeDSHandler({
    payload: {
      next_action: {
        iframe_resources: {
          iframe,
          verify_transaction_status_url: "/api/v1/verify/1",
        },
      },
    },
    apiKey: "api-key",
    baseUrl: "https://stage.tonder.io",
  });
}

describe("sanitize3dsMarkup", () => {
  it("keeps the form, its hidden input and the target iframe the 3DS Method step needs", () => {
    const container = document.createElement("div");
    container.appendChild(sanitize3dsMarkup(THREE_DS_METHOD_MARKUP));

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(form!.id).toBe("tdsMmethodForm");
    expect(form!.getAttribute("action")).toBe("https://acs.example.com/3ds-method");
    expect(form!.getAttribute("target")).toBe("tdsMmethodTgtFrame");
    expect(container.querySelector("input[name='threeDSMethodData']")).not.toBeNull();
    expect(container.querySelector("iframe#tdsMmethodTgtFrame")).not.toBeNull();
  });

  it("removes inline event handlers", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(`<img src="https://acs.example.com/x.png" onerror="stealCard()" />`),
    );

    const img = container.querySelector("img")!;
    expect(img.getAttribute("onerror")).toBeNull();
    expect(img.getAttribute("src")).toBe("https://acs.example.com/x.png");
  });

  it("removes script elements", () => {
    const container = document.createElement("div");
    container.appendChild(sanitize3dsMarkup(`<div></div><script>stealCard()</script>`));

    expect(container.querySelector("script")).toBeNull();
  });

  it("drops non-https URLs while keeping https and relative ones", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(
        `<a id="js" href="javascript:stealCard()"></a>` +
          `<iframe id="srcdoc" srcdoc="<script>stealCard()</script>"></iframe>` +
          `<form id="rel" action="/api/v1/challenge"></form>`,
      ),
    );

    expect(container.querySelector("#js")!.getAttribute("href")).toBeNull();
    expect(container.querySelector("#srcdoc")!.getAttribute("srcdoc")).toBeNull();
    expect(container.querySelector("#rel")!.getAttribute("action")).toBe("/api/v1/challenge");
  });

  it("removes script elements the parser leaves in the SVG namespace", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(`<div></div><svg><script>stealCard()</script></svg>`),
    );

    // tagName is "script" in lowercase here, so an uppercase set never matched it and
    // the element travelled into the page intact.
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("removes an SVG link whose javascript: URL hides behind a namespace prefix", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(
        `<svg><a id="svg-link" xlink:href="javascript:stealCard()"><text>pay</text></a></svg>`,
      ),
    );

    // The qualified name is "xlink:href", which the URL set never matched, so the
    // scheme check was never reached.
    expect(container.querySelector("#svg-link")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
  });

  it("removes style elements, whose selectors are not scoped to the fragment", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(
        `<div></div><style>input{background:url("https://attacker.example/x")}</style>`,
      ),
    );

    expect(container.querySelector("style")).toBeNull();
    expect(container.innerHTML).not.toContain("attacker.example");
  });

  it("removes the style attribute, which the caller no longer depends on", () => {
    const container = document.createElement("div");
    container.appendChild(sanitize3dsMarkup(THREE_DS_METHOD_MARKUP));

    // The step's own markup carries style="display: none" here, but the SDK hides its
    // container itself, so nothing is lost and an overlay over the card fields has no
    // way in.
    expect(container.querySelector("iframe")!.getAttribute("style")).toBeNull();
  });

  it("removes an element-scoped style that would cover the card fields", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(
        `<div id="overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh"></div>`,
      ),
    );

    expect(container.querySelector("#overlay")!.getAttribute("style")).toBeNull();
  });

  it("removes ping, which POSTs to a remote origin on click", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(
        `<a id="beacon" href="https://acs.example.com/x" ping="https://attacker.example/steal"></a>`,
      ),
    );

    // https says nothing about a beacon: the attacker's collector is https too. The
    // attribute goes rather than being scheme-checked.
    expect(container.querySelector("#beacon")!.getAttribute("ping")).toBeNull();
    expect(container.querySelector("#beacon")!.getAttribute("href")).toBe(
      "https://acs.example.com/x",
    );
  });

  it("removes srcset, whose candidate list no scheme check can judge", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(
        `<img id="candidates" srcset="https://acs.example.com/a.png 1x, http://attacker.example/b.png 2x" />`,
      ),
    );

    // Resolved whole, this string parses as one https path and would pass a scheme
    // check while the http candidate inside it still loads.
    expect(container.querySelector("#candidates")!.getAttribute("srcset")).toBeNull();
  });

  it("scheme-checks background, which is a single URL", () => {
    const container = document.createElement("div");
    container.appendChild(
      sanitize3dsMarkup(
        `<table id="insecure" background="http://attacker.example/bg.png"></table>` +
          `<table id="secure" background="https://acs.example.com/bg.png"></table>`,
      ),
    );

    expect(container.querySelector("#insecure")!.getAttribute("background")).toBeNull();
    expect(container.querySelector("#secure")!.getAttribute("background")).toBe(
      "https://acs.example.com/bg.png",
    );
  });

  it("drops non-https URLs whatever case the attribute was written in", () => {
    const container = document.createElement("div");
    container.appendChild(sanitize3dsMarkup(`<a id="js" HREF="javascript:stealCard()"></a>`));

    expect(container.querySelector("#js")!.getAttribute("href")).toBeNull();
  });
});

describe("ThreeDSHandler.loadIframe", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("renders the 3DS Method form and resolves once its target iframe loads", async () => {
    const handler = buildHandler(THREE_DS_METHOD_MARKUP);

    const loading = handler.loadIframe();
    const target = document.getElementById("tdsMmethodTgtFrame");

    expect(target).not.toBeNull();
    expect(document.getElementById("tdsMmethodForm")).not.toBeNull();

    target!.dispatchEvent(new Event("load"));
    await expect(loading).resolves.toBe(true);
  });

  it("does not carry attacker-controlled event handlers from the payload into the page", () => {
    const handler = buildHandler(
      `<img id="payload-img" src="https://acs.example.com/x.png" onerror="window.__tonderXss = true" />` +
        THREE_DS_METHOD_MARKUP,
    );

    handler.loadIframe();

    const injected = document.getElementById("payload-img")!;
    expect(injected.getAttribute("onerror")).toBeNull();
    // jsdom does not fetch images, so assert the handler itself was never registered.
    expect((injected as HTMLElement & { onerror?: unknown }).onerror).toBeNull();
  });

  it("does not carry a namespaced script from the payload into the merchant document", () => {
    const handler = buildHandler(
      `<svg><script id="payload-svg-script">window.__tonderXss = true</script></svg>` +
        THREE_DS_METHOD_MARKUP,
    );

    handler.loadIframe();

    // The SDK inserts the fragment into the live document, where a script that was
    // never marked already-started runs on insertion. Removal is the only protection.
    expect(document.getElementById("payload-svg-script")).toBeNull();
    expect(document.querySelector("svg")).toBeNull();
  });

  it("hides the container it inserts, so the step renders nothing either way", () => {
    const handler = buildHandler(THREE_DS_METHOD_MARKUP);

    handler.loadIframe();

    const target = document.getElementById("tdsMmethodTgtFrame")!;
    // The ACS markup asked for display: none and the sanitizer took the attribute away.
    // The step stays invisible because the SDK hides its own container, not because the
    // payload was polite.
    expect(target.getAttribute("style")).toBeNull();
    // display is not inherited, so the child still computes its own value; the container
    // being none is what takes the whole subtree out of rendering.
    expect(getComputedStyle(target.parentElement!).display).toBe("none");
  });
});
