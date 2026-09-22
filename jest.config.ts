import type { JestConfigWithTsJest } from 'ts-jest'
import packageJson from './package.json'

const jestConfig: JestConfigWithTsJest = {
  testEnvironment: "jsdom",
  // A checkout page is https in every environment that matters, and the SDK resolves
  // relative URLs against it. jsdom defaults to http://localhost, which would make
  // relative URLs fail the https-only scheme check for a reason production never has.
  testEnvironmentOptions: { url: "https://localhost/" },
  preset: 'ts-jest',
  // Rollup's replace plugin injects these at build time; tests get the same values.
  globals: {
    __SDK_NAME__: packageJson.name,
    __SDK_VERSION__: packageJson.version,
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
      },
    ],
  },
}

export default jestConfig
