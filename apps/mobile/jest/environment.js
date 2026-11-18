// The Jest environment of the app: jest-expo's, plus Node's own `fetch` kept on the side.
//
// jest-expo replaces the global `fetch` with Expo's (it needs native code, which Jest does not
// have). MSW 3 intercepts at the socket level and hands the request on to the global `fetch` that
// was there before it, so it needs Node's `fetch` to work. This environment saves that one
// (`globalThis.nodeFetch`) before jest-expo's setup replaces it; `src/test/msw/server.ts` puts it back.
const ReactNativeEnvironment = require('jest-expo/src/preset/nativeEnvironment');

class PantryEnvironment extends ReactNativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.nodeFetch = this.global.fetch;
  }
}

module.exports = PantryEnvironment;
module.exports.TestEnvironment = PantryEnvironment;
