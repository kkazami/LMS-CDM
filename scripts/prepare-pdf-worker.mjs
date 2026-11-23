import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('../apps/web/', import.meta.url));
const webRequire = createRequire(path.join(web, 'package.json'));
const reactPdfRequire = createRequire(webRequire.resolve('react-pdf'));
const { version } = JSON.parse(await readFile(reactPdfRequire.resolve('pdfjs-dist/package.json'), 'utf8'));
const destination = path.join(web, 'public/pdf-runtime', version);

await mkdir(destination, { recursive: true });
await copyFile(reactPdfRequire.resolve('pdfjs-dist/build/pdf.worker.min.mjs'), path.join(destination, 'pdf.worker.min.mjs'));
