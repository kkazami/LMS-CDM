import { randomBytes } from 'node:crypto';
import { codeLabSandboxCsp } from '@/lib/codelab-sandbox';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  // Next may expose its internal localhost URL; messages must target the public host.
  const internalUrl = new URL(request.url);
  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProtocol === 'https' || forwardedProtocol === 'http' ? `${forwardedProtocol}:` : internalUrl.protocol;
  const origin = new URL(`${protocol}//${request.headers.get('host') || internalUrl.host}`).origin;
  const nonce = randomBytes(18).toString('base64');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>CodeLab practice sandbox</title></head><body>
<script nonce="${nonce}">
const appOrigin = ${JSON.stringify(origin)};
let active = false;
addEventListener('message', async event => {
  if (active || event.source !== parent || event.origin !== appOrigin || event.data?.type !== 'run') return;
  active = true;
  const {id, language, code, stdin} = event.data;
  const send = data => parent.postMessage({id, ...data}, appOrigin);
  try {
    const response = await fetch(appOrigin + '/codelab-runtime/practice-worker.js', {credentials:'omit', redirect:'error'});
    if (!response.ok) throw Error('Unable to load practice worker');
    const blob = URL.createObjectURL(new Blob([await response.text()], {type:'text/javascript'}));
    const worker = new Worker(blob);
    URL.revokeObjectURL(blob);
    worker.onmessage = e => send(e.data);
    worker.onerror = () => send({type:'error', message:'Browser runtime failed. You can choose Run on server.'});
    worker.postMessage({language, code, stdin, assets:appOrigin + '/codelab-runtime/'});
  } catch (_) { send({type:'error', message:'Browser runtime could not load. You can choose Run on server.'}); }
});
parent.postMessage({type:'sandbox-ready'}, appOrigin);
</script></body></html>`;
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': codeLabSandboxCsp(origin, nonce),
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': 'no-store',
  } });
}
