import type { CodeSubmissionResponse } from './judge0-client';
import { wrapStudentCode } from './code-wrappers';

export type BrowserLanguage = 'javascript' | 'python' | 'sql';
export const supportsBrowserRun = (language: string): language is BrowserLanguage =>
  ['javascript', 'python', 'sql'].includes(language);

/** All messages are practice data, never authoritative test results. */
export function runBrowserPractice(language: BrowserLanguage, source: string, stdin: string,
  signal: AbortSignal, onPhase: (phase: string) => void): Promise<CodeSubmissionResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Practice stopped.')); return; }
    if (new TextEncoder().encode(source).length > 65536) { reject(new Error('Source code exceeds 64 KB.')); return; }
    const code = wrapStudentCode(language, source, null, stdin);
    const id = crypto.randomUUID();
    const iframe = document.createElement('iframe');
    iframe.hidden = true;
    iframe.title = 'Isolated code practice';
    iframe.sandbox.add('allow-scripts');
    let timer: ReturnType<typeof setTimeout>;
    let done = false;
    let sent = false;
    let executing = false;
    const finish = (error?: Error, result?: CodeSubmissionResponse) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      signal.removeEventListener('abort', abort);
      iframe.remove();
      if (error) reject(error); else resolve(result!);
    };
    const abort = () => finish(new Error('Practice stopped.'));
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || event.origin !== 'null' || done) return;
      const data = event.data;
      if (data?.type === 'sandbox-ready' && !sent) {
        sent = true;
        iframe.contentWindow!.postMessage({ type: 'run', id, language, code, stdin }, '*');
      } else if (sent && data?.id === id) {
        if (data.type === 'executing' && !executing) {
          executing = true;
          clearTimeout(timer);
          timer = setTimeout(() => finish(new Error('Practice exceeded 10 seconds and was stopped.')), 10_000);
          onPhase('Running in your browser…');
        } else if (data.type === 'error') {
          finish(new Error('Browser runtime could not load. You can choose Run on server.'));
        } else if (data.type === 'result') {
          const result = data.result;
          if (!result || ![3, 11].includes(result.status?.id) ||
            typeof result.stdout !== 'string' || typeof result.stderr !== 'string' ||
            new TextEncoder().encode(result.stdout).length > 65536 ||
            new TextEncoder().encode(result.stderr).length > 65536) {
            finish(new Error('Invalid browser execution result.'));
          } else {
            finish(undefined, { stdout: result.stdout, stderr: result.stderr, compile_output: null,
              status: { id: result.status.id, description: 'Practice result' },
              time: typeof result.time === 'string' ? result.time.slice(0, 30) : '0', memory: 0 });
          }
        }
      }
    };
    onPhase('Loading browser runtime…');
    timer = setTimeout(() => finish(new Error('Browser runtime did not load within 60 seconds. Choose Run on server.')), 60_000);
    window.addEventListener('message', receive);
    signal.addEventListener('abort', abort, { once: true });
    iframe.src = '/codelab-sandbox';
    document.body.appendChild(iframe);
  });
}
