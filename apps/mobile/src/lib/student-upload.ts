import { API_BASE_URL } from './constants';
import { useAuthStore } from '../stores/auth-store';
import { studentScope, scopeIsCurrent } from './student-scope';

export function uploadStudentFile(uri: string, name: string, mime: string, signal: AbortSignal, onProgress: (percent: number) => void): Promise<{ url: string; fileName: string }> {
  const scope = studentScope(), { token, isSessionVerified } = useAuthStore.getState();
  if (!token || !isSessionVerified) return Promise.reject(new Error('Reconnect to verify your sign-in before uploading.'));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cancel = () => xhr.abort();
    const finish = () => signal.removeEventListener('abort', cancel);
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.withCredentials = false;
    xhr.timeout = 300000;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = event => { if (event.lengthComputable && scopeIsCurrent(scope)) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      finish();
      if (!scopeIsCurrent(scope)) { reject(new Error('Sign-in changed. Reopen this assignment.')); return; }
      if (xhr.status === 401) { useAuthStore.getState().expireSession(); reject(new Error('Sign in again. Your file stays on this device.')); return; }
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300 || typeof body.url !== 'string') throw new Error(body.message || body.error || 'Upload was not confirmed. Your device copy is kept; retry when connected.');
        resolve({ url: body.url, fileName: body.fileName || name });
      } catch (error) { reject(error instanceof Error ? error : new Error('Upload was not confirmed. Retry when connected.')); }
    };
    xhr.onerror = xhr.ontimeout = () => { finish(); reject(new Error('Upload was not confirmed. Your device copy is kept; reconnect and retry.')); };
    xhr.onabort = () => { finish(); reject(new Error('Upload paused. Your device copy is kept; tap Retry upload to start again.')); };
    if (signal.aborted) { reject(new Error('Upload cancelled.')); return; }
    signal.addEventListener('abort', cancel, { once: true });
    const body = new FormData();
    body.append('file', { uri, name, type: mime } as any);
    xhr.send(body);
  });
}
