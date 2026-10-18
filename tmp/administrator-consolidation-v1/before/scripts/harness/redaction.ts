/** Best-effort DLP for evidence. Host isolation is still needed for unknown secret formats. */
export function sanitize(text: string, values: string[] = []): string {
  for (const value of values.filter(v => v.length >= 4).sort((a, b) => b.length - a.length)) text = text.split(value).join('[REDACTED]');
  return text
    .replace(/(?:postgres(?:ql)?|https?):\/\/[^\s/@]+:[^\s/@]+@[^\s"']+/gi, '[REDACTED_URL]')
    .replace(/(authorization\s*[:=]\s*)(?:bearer\s+)?[^\s"']+/gi, '$1[REDACTED]')
    .replace(/((?:password|smtp_pass|api[_-]?key|access[_-]?token|client[_-]?secret)\s*["']?\s*[:=]\s*)["'][^"'\r\n]+["']/gi, '$1"[REDACTED]"')
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]');
}
