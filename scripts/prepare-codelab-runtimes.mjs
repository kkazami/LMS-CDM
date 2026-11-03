import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const target = path.join(root, 'apps/web/public/codelab-runtime');
const packages = {
  pyodide: ['pyodide.js', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'],
  'sql.js': ['sql-wasm.js', 'sql-wasm.wasm'],
};
for (const [name, files] of Object.entries(packages)) {
  const packageRoot = name === 'sql.js' ? path.resolve(path.dirname(require.resolve(name)), '..') : path.dirname(require.resolve(`${name}/package.json`));
  const { version } = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const destination = path.join(target, `${name}-${version}`);
  await mkdir(destination, { recursive: true });
  for (const file of files) {
    await copyFile(path.join(packageRoot, name === 'sql.js' ? 'dist' : '', file), path.join(destination, file));
  }
}
console.log('CodeLab browser runtimes prepared from pinned local packages.');
