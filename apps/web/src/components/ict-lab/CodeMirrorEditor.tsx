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

function buildEditorTheme(mode: ThemeMode) {
  const isDark = mode === "dark";
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
        backgroundColor: isDark ? "rgba(59, 130, 246, 0.32)" : "rgba(37, 99, 235, 0.18)",
        outline: "1px solid rgba(59, 130, 246, 0.55)",
      },
      "&.cm-focused": {
        outline: "none",
      },
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
      viewRef.current = null;
    };
    // Re-create editor only on mount/unmount; theme, language, placeholder & value updates are reconfigured below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically switch CodeMirror theme when app themeMode changes without reload
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
