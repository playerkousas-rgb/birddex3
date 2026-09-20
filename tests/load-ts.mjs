// Reuse the project's TypeScript compiler; no test framework/runtime dependency.
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

export function loadTs(file, overrides = {}, cache = new Map()) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const localRequire = createRequire(path);
  const require = specifier => {
    if (specifier in overrides) return overrides[specifier];
    if (specifier.startsWith('.') && !specifier.endsWith('.json')) {
      const target = resolve(dirname(path), specifier);
      for (const candidate of [target, `${target}.ts`, `${target}.tsx`]) {
        if (existsSync(candidate)) return loadTs(candidate, overrides, cache);
      }
    }
    return localRequire(specifier);
  };
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: path,
  });
  new Function('require', 'module', 'exports', outputText)(require, module, module.exports);
  return module.exports;
}
