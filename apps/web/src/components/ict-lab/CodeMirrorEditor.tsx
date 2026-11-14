"use client";

import React, { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, placeholder as cmPlaceholder } from "@codemirror/view";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { useTheme, type ThemeMode } from "@/lib/theme-context";

export type PlaygroundEditorLanguage = "html" | "css" | "javascript";

export interface CodeMirrorEditorProps {
  language: PlaygroundEditorLanguage;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * WCAG AA+ dark-mode syntax palette mapped from CodeMirror's `defaultHighlightStyle` light hex colors.
 * Every color meets at least 6.3:1 contrast against the dark editor surface (`#1A1D27`):
 * - `#404740` (meta / angle brackets / punctuation) -> `#CBD5E1` (11.6:1)
 * - `#708`    (keywords: const, let, function, return, if) -> `#C084FC` (6.9:1)
 * - `#219`    (atoms, booleans, HTML tag names) -> `#60A5FA` (7.0:1)
 * - `#164`    (numbers, literals) -> `#4ADE80` (10.6:1)
 * - `#a11`    (strings) -> `#FCA5A5` (9.2:1)
 * - `#e40`    (regex, escape sequences) -> `#FDBA74` (10.4:1)
 * - `#00f`    (variable definitions) -> `#93C5FD` (9.9:1)
 * - `#30a`    (local variables / parameters) -> `#A5B4FC` (8.9:1)
 * - `#085`    (types, namespaces, HTML attributes) -> `#5EEAD4` (11.9:1)
 * - `#167`    (class names, CSS selectors) -> `#67E8F9` (12.3:1)
 * - `#256`    (special variables, macros) -> `#7DD3FC` (10.8:1)
 * - `#00c`    (property names, CSS properties) -> `#7DD3FC` (10.8:1)
 * - `#940`    (comments) -> `#94A3B8` (6.7:1, italic)
 * - `#f00`    (invalid tokens) -> `#F87171` (6.3:1)
 */
const DARK_SYNTAX_COLOR_BY_DEFAULT_HEX: Record<string, { color: string; fontStyle?: string }> = {
  "#404740": { color: "#CBD5E1" },
  "#708": { color: "#C084FC" },
  "#219": { color: "#60A5FA" },
  "#164": { color: "#4ADE80" },
  "#a11": { color: "#FCA5A5" },
  "#e40": { color: "#FDBA74" },
  "#00f": { color: "#93C5FD" },
  "#30a": { color: "#A5B4FC" },
  "#085": { color: "#5EEAD4" },
  "#167": { color: "#67E8F9" },
  "#256": { color: "#7DD3FC" },
  "#00c": { color: "#7DD3FC" },
  "#940": { color: "#94A3B8", fontStyle: "italic" },
  "#f00": { color: "#F87171" },
};

const FALLBACK_DEFAULT_SELECTOR_BY_HEX: Record<string, string> = {
  "#404740": ".ͼ5",
  "#708": ".ͼb",
  "#219": ".ͼc",
  "#164": ".ͼd",
  "#a11": ".ͼe",
  "#e40": ".ͼf",
  "#00f": ".ͼg",
  "#30a": ".ͼh",
  "#085": ".ͼi",
  "#167": ".ͼj",
  "#256": ".ͼk",
  "#00c": ".ͼl",
  "#940": ".ͼm",
  "#f00": ".ͼn",
};

function buildDarkSyntaxRuleOverrides(): Record<string, Record<string, string>> {
  const collectedRules: string[] = [];

  function walkExtension(node: unknown) {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) walkExtension(item);
      return;
    }
    if (typeof node === "object") {
      const rec = node as Record<string, unknown>;
      if (Array.isArray(rec.rules)) {
        for (const r of rec.rules) {
          if (typeof r === "string") collectedRules.push(r);
        }
      }
      if (rec.value) walkExtension(rec.value);
      if (rec.module) walkExtension(rec.module);
    }
  }

  walkExtension(basicSetup);

  const overrides: Record<string, Record<string, string>> = {};

  for (const rule of collectedRules) {
    const match = rule.match(/^(\.\S+)\s*\{\s*color:\s*(#[0-9a-fA-F]+)\s*;\s*\}$/);
    if (!match) continue;
    const selector = match[1]!;
    const hex = match[2]!.toLowerCase();
    const darkStyle = DARK_SYNTAX_COLOR_BY_DEFAULT_HEX[hex];
    if (darkStyle) {
      overrides[`& ${selector}`] = {
        color: darkStyle.color,
        ...(darkStyle.fontStyle ? { fontStyle: darkStyle.fontStyle } : {}),
      };
    }
  }

  // Ensure fallback selectors are also present if `basicSetup` structure ever changes
  for (const [hex, selector] of Object.entries(FALLBACK_DEFAULT_SELECTOR_BY_HEX)) {
    const key = `& ${selector}`;
    if (!overrides[key]) {
      const darkStyle = DARK_SYNTAX_COLOR_BY_DEFAULT_HEX[hex];
      if (darkStyle) {
        overrides[key] = {
          color: darkStyle.color,
          ...(darkStyle.fontStyle ? { fontStyle: darkStyle.fontStyle } : {}),
        };
      }
    }
  }

  return overrides;
}

export function buildEditorTheme(mode: ThemeMode) {
  const isDark = mode === "dark";
  const darkSyntaxOverrides = isDark ? buildDarkSyntaxRuleOverrides() : {};

  return EditorView.theme(
    {
      "&": {
        backgroundColor: "var(--bg-surface)",
        color: "var(--text-primary)",
        colorScheme: isDark ? "dark" : "light",
        fontSize: "13.5px",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        height: "100%",
      },
      ".cm-scroller": {
        overflow: "auto",
        lineHeight: "1.6",
        fontFamily: "inherit",
      },
      ".cm-content": {
        padding: "12px 0",
        color: "var(--text-primary)",
        caretColor: isDark ? "rgb(96, 165, 250)" : "rgb(29, 78, 216)",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: isDark ? "rgb(96, 165, 250)" : "rgb(29, 78, 216)",
        borderLeftWidth: "2px",
      },
      ".cm-gutters": {
        backgroundColor: "var(--bg-elevated)",
        color: "var(--text-secondary)",
        borderRight: "1px solid var(--border-color)",
        minWidth: "42px",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDark ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.10)",
        color: isDark ? "rgb(147, 197, 253)" : "rgb(29, 78, 216)",
        fontWeight: "600",
      },
      ".cm-activeLine": {
        backgroundColor: isDark ? "rgba(59, 130, 246, 0.10)" : "rgba(37, 99, 235, 0.06)",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: isDark
          ? "rgba(59, 130, 246, 0.35) !important"
          : "rgba(37, 99, 235, 0.20) !important",
      },
      ".cm-placeholder": {
        color: "var(--text-secondary)",
        fontStyle: "italic",
      },
      ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
        backgroundColor: isDark ? "rgba(59, 130, 246, 0.35)" : "rgba(37, 99, 235, 0.18)",
        color: isDark ? "#FDE047 !important" : "inherit",
        outline: isDark ? "1px solid rgba(147, 197, 253, 0.75)" : "1px solid rgba(59, 130, 246, 0.55)",
      },
      ".cm-nonmatchingBracket, &.cm-focused .cm-nonmatchingBracket": {
        backgroundColor: isDark ? "rgba(239, 68, 68, 0.30)" : "rgba(239, 68, 68, 0.18)",
        color: isDark ? "#FCA5A5 !important" : "inherit",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ...darkSyntaxOverrides,
    },
    { dark: isDark }
  );
}

function getLanguageExtension(language: PlaygroundEditorLanguage) {
  switch (language) {
    case "html":
      return html();
    case "css":
      return css();
    case "javascript":
      return javascript();
  }
}

export default function CodeMirrorEditor({
  language,
  value,
  onChange,
  placeholder = "",
  ariaLabel = "Code editor",
}: CodeMirrorEditorProps) {
  const { themeMode } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartmentRef = useRef(new Compartment());
  const themeCompartmentRef = useRef(new Compartment());
  const placeholderCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        themeCompartmentRef.current.of(buildEditorTheme(themeMode)),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
        langCompartmentRef.current.of(getLanguageExtension(language)),
        placeholderCompartmentRef.current.of(placeholder ? cmPlaceholder(placeholder) : []),
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      view.contentDOM.remove();
      viewRef.current = null;
    };
    // Re-create editor only on mount/unmount; theme, language, placeholder & value updates are reconfigured below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically switch CodeMirror theme (including dark syntax highlighting) when app themeMode changes without reload
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(buildEditorTheme(themeMode)),
    });
  }, [themeMode]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: langCompartmentRef.current.reconfigure(getLanguageExtension(language)),
    });
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: placeholderCompartmentRef.current.reconfigure(
        placeholder ? cmPlaceholder(placeholder) : []
      ),
    });
  }, [placeholder]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentText = view.state.doc.toString();
    if (currentText !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentText.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-surface text-primary-theme"
      data-testid={`codemirror-${language}`}
      data-editor-theme={themeMode}
    />
  );
}
