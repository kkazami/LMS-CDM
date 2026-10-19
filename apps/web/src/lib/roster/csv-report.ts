/** Shared by server reports and browser exports; no server-only dependencies. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
    text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csvFile(rows: unknown[][]) {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
