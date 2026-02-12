/**
 * SDK information injected from package.json at build time
 * Values are replaced by Rollup's replace plugin
 */
declare const __SDK_NAME__: string;
declare const __SDK_VERSION__: string;

export const SDK_INFO = Object.freeze({
  name: __SDK_NAME__,
  version: __SDK_VERSION__,
});
