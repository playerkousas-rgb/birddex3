/**
 * 唯一 runtime 版號（真理倉 docs/13 V2）。
 * 三處同步，tests/version.test.mjs 守門：
 *   package.json "version" ↔ index.html <meta name="app-version"> ↔ 呢個常數
 */
export const APP_VERSION = '3.1.0';
