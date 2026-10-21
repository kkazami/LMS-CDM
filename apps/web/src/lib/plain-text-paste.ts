import type { ClipboardEvent } from 'react';
/** Contenteditable paste must not briefly execute HTML before the server cleans it. */
export function pastePlainText(event: ClipboardEvent<HTMLElement>) {
  event.preventDefault();
  document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
}
