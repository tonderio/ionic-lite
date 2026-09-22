/**
 * Scheme check shared by every sink a URL from the 3DS payload can reach: the
 * attributes of the ACS markup and the challenge redirect.
 *
 * Resolution goes through the platform's URL parser rather than a prefix match. The
 * parser strips the leading whitespace and the embedded tabs and newlines a crafted
 * string uses to hide its scheme, and lowercases the result, so "JavaScript:" and a
 * scheme followed by a comment that merely contains the word http are both classified
 * on what they actually are.
 *
 * https only. A production ACS is always https — the card schemes require it — so
 * allowing http would only add a downgrade path for someone on the network to serve
 * the challenge. If a local sandbox over http is ever needed, widen this deliberately.
 */

const ALLOWED_SCHEMES = new Set(["https:"]);

export function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;

  try {
    return ALLOWED_SCHEMES.has(new URL(value, document.baseURI).protocol);
  } catch {
    return false;
  }
}
