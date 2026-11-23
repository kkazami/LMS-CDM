// Offline TypeScript loader for the Linux sandbox (installed esbuild is Windows-only).
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
if (Module.registerHooks) Module.registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); } catch (error) {
    if (specifier.startsWith('.') && context.parentURL && !path.extname(specifier)) {
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        try { return next(new URL(specifier + suffix, context.parentURL).href, context); } catch {}
      }
    }
    throw error;
  }
} });
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...args) {
  if (name.startsWith('@/')) name = path.join(root, 'apps/web/src', name.slice(2));
  if (name === '@lms/types') name = path.join(root, 'packages/types/src/index.ts');
  return resolve.call(this, name, parent, ...args);
};
for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, file) => {
  const importUrl = context => {
    const visit = node => ts.isPropertyAccessExpression(node) && ts.isMetaProperty(node.expression) && node.name.text === 'url'
      ? ts.factory.createStringLiteral(pathToFileURL(file).href) : ts.visitEachChild(node, visit, context);
    return source => ts.visitNode(source, visit);
  };
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file, transformers: { before: [importUrl] }, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  });
  mod._compile(result.outputText, file);
};
