/** The sandbox has no LMS authority. Only immutable runtime files are reachable. */
export function codeLabSandboxCsp(origin: string, nonce: string) {
  const assets = `${origin}/codelab-runtime/`;
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'unsafe-eval' blob: ${assets}`,
    `connect-src ${assets}`,
    "worker-src blob:",
    "frame-ancestors 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "sandbox allow-scripts",
  ].join('; ');
}
