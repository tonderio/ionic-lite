/**
 * The 3DS Method step cannot be rendered as text: the ACS sends back a hidden form
 * and the iframe it targets, and the flow submits that form by id. So the markup has
 * to reach the DOM as markup, and the only safe handling is to strip what the step
 * never needs — script execution, event handlers, CSS, beacons and non-https URLs —
 * before insertion.
 *
 * Parsing happens in a document with no browsing context, so nothing loads, navigates
 * or executes while the markup is being inspected. That inertness does not survive the
 * move: a script carried out of a parsed document into a live one has not been marked
 * already-started, so insertion runs it. Removal is the protection, never inertness.
 */

import { isHttpsUrl } from "./safeUrl";

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

/**
 * Compared against localName, which is lowercase in every namespace. tagName is not:
 * the parser only uppercases it for HTML elements, so an SVG script reports "script"
 * and slips past an uppercase set.
 */
const FORBIDDEN_ELEMENTS = new Set([
  "script",
  "object",
  "embed",
  "applet",
  "link",
  "meta",
  "base",
  // A style block is not scoped to the fragment it arrived in. Its selectors reach the
  // merchant's own card fields, and url() in a matched rule turns an attribute value
  // into a request to wherever the ACS payload chose.
  "style",
  // A template's content is a separate fragment that querySelectorAll never descends
  // into, so its markup would travel into the page unsanitized. The step has no use
  // for one.
  "template",
]);

/**
 * Dropped outright, because no value of theirs is one this step has a use for and
 * none of them is a plain URL the scheme check could judge.
 */
const FORBIDDEN_ATTRIBUTES = new Set([
  "srcdoc",
  // The caller hides its own container, so the step needs no CSS of its own. Left in,
  // a style attribute still positions an element over the merchant's card fields.
  "style",
  // A space-separated list of URLs the browser POSTs to on click. https tells us
  // nothing here: exfiltration to an attacker's origin is https too, so the scheme
  // check would pass the attack and reject only the benign multi-URL form.
  "ping",
  // A candidate list ("a.png 1x, b.png 2x"), not a URL. The parser folds the whole
  // string into one path and calls it https, so a scheme check reads as a guarantee
  // while inspecting none of the candidates.
  "srcset",
]);

// Single-URL attributes, each judged on its own resolved scheme.
const URL_ATTRIBUTES = new Set([
  "src",
  "href",
  "action",
  "formaction",
  "data",
  "poster",
  "background",
]);

// An attribute may legitimately hold nothing, or point an iframe at the blank page;
// neither carries anywhere to navigate to. Everything else goes through the shared
// scheme check.
function isSafeAttributeUrl(value: string): boolean {
  const candidate = value.trim();
  if (candidate === "") return true;
  if (candidate.toLowerCase() === "about:blank") return true;

  return isHttpsUrl(candidate);
}

/**
 * Matches on localName and removes by node, so a prefixed attribute is judged on what
 * it does rather than on how it was spelled: in foreign content the parser keeps the
 * prefix, and "xlink:href" as a qualified name matches neither the handler test nor the
 * URL set. The element walk below already keeps foreign content out of the fragment —
 * this does not lean on it, so relaxing that rule cannot silently reopen the hole.
 */
function sanitizeElement(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.localName.toLowerCase();

    if (name.startsWith("on") || FORBIDDEN_ATTRIBUTES.has(name)) {
      element.removeAttributeNode(attribute);
      continue;
    }

    if (URL_ATTRIBUTES.has(name) && !isSafeAttributeUrl(attribute.value)) {
      element.removeAttributeNode(attribute);
    }
  }
}

/**
 * Parses 3DS markup and returns a fragment owned by the current document, with every
 * executable construct removed. Throws nothing: unparseable markup yields an empty
 * fragment, which the caller treats as a missing redirection.
 */
export function sanitize3dsMarkup(markup: string): DocumentFragment {
  const parsed = new DOMParser().parseFromString(markup, "text/html");

  for (const element of Array.from(parsed.body.querySelectorAll("*"))) {
    // Foreign content goes entirely. SVG and MathML are where the parser's exceptions
    // live — case-preserving names, prefixed attributes, SMIL animating an href into a
    // javascript: URL, integration points that switch parsing back to HTML mid-subtree
    // — and each one is a separate way past a rule written for HTML. The step this
    // sanitizer exists for is a hidden form and its hidden target iframe, so nothing it
    // needs is out there to lose.
    if (element.namespaceURI !== HTML_NAMESPACE || FORBIDDEN_ELEMENTS.has(element.localName)) {
      element.remove();
      continue;
    }

    sanitizeElement(element);
  }

  const fragment = document.createDocumentFragment();
  for (const node of Array.from(parsed.body.childNodes)) {
    fragment.appendChild(document.importNode(node, true));
  }

  return fragment;
}
