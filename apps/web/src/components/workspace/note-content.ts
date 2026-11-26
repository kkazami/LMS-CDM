import type { CSSProperties } from "react";

export type ChecklistItem = { text: string; checked: boolean };

export function noteColorStyle(color: string): CSSProperties | undefined {
  return color.toLowerCase() === "#ffffff" ? undefined : { "--note-color": color } as CSSProperties;
}

export function readNoteContent(html: string) {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const list = body.firstElementChild;
  if (list?.matches('ul[data-note-checklist="true"]') && body.childNodes.length === 1) {
    const checklist = Array.from(list.children, item => ({
      text: item.textContent ?? "",
      checked: item.getAttribute("data-checked") === "true",
    }));
    return { text: checklist.map(item => item.text).join("\n"), checklist };
  }

  body.querySelectorAll("br").forEach(element => element.replaceWith("\n"));
  body.querySelectorAll("p,div,li,h2,h3,pre,blockquote").forEach(element => element.after("\n"));
  return { text: (body.textContent ?? "").trim(), checklist: null };
}

export function writeChecklist(items: ChecklistItem[]) {
  const list = document.createElement("ul");
  list.dataset.noteChecklist = "true";
  for (const item of items) {
    const text = item.text.trim();
    if (!text) continue;
    const row = document.createElement("li");
    row.dataset.checked = String(item.checked);
    row.textContent = text;
    list.append(row);
  }
  return list.outerHTML;
}
