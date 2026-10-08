/**
 * src/env.d.ts: types for the virtual module produced by build/plugin.ts.
 */
/// <reference types="vite/client" />
declare module 'virtual:genome-data' {
  const bundle: import('../shared/types').Bundle;
  export default bundle;
}
