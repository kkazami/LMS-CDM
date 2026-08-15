import { create } from "zustand";
import { CodeLabLanguage, generateStarterCode, FuncSignature } from "../utils/starter-code";
import { CodeSubmissionResponse } from "../utils/judge0-client";

export interface TestCase {
  input: string; // e.g. "5, 10" or "hello"
  expectedOutput: string; // e.g. "15"
  isHidden: boolean;
}

export interface TestCaseResult {
  passed: boolean;
  actualOutput: string | null;
  error?: string;
  time?: string;
}

/** Forensic paste event — logged silently for instructor review, never blocks the student. */
export interface PasteEvent {
  timestamp: string;
  charCount: number;
  language: CodeLabLanguage;
}

interface CodeLabState {
  // Config
  language: CodeLabLanguage;
  signature: FuncSignature | null;
  testCases: TestCase[];
  
  // Editor State
  codeByLanguage: Record<CodeLabLanguage, string>;
  
  // Execution State
  isExecuting: boolean;
  consoleOutput: CodeSubmissionResponse | null;
  testResults: TestCaseResult[];
  activeTab: "editor" | "console" | "tests";

  // Paste Detection & Keystroke Velocity
  pasteCount: number;
  pasteEvents: PasteEvent[];
  typedCharCount: number;
  sessionStartMs: number;

  // Submission tracking (client-side awareness of rate limit)
  submissionCount: number;

  // Timer reference
  startedAt: string;

  // Actions
  initialize: (lang: CodeLabLanguage, sig: FuncSignature, tests: TestCase[]) => void;
  setLanguage: (lang: CodeLabLanguage) => void;
  updateCode: (code: string) => void;
  setExecuting: (exec: boolean) => void;
  setConsoleOutput: (out: CodeSubmissionResponse | null) => void;
  setTestResults: (results: TestCaseResult[]) => void;
  setActiveTab: (tab: "editor" | "console" | "tests") => void;
  addPasteEvent: (event: PasteEvent) => void;
  incrementPasteCount: () => void;
  incrementTypedChars: (count: number) => void;
  incrementSubmission: () => void;
  setStartedAt: (iso: string) => void;
}

const ALL_LANGUAGES: CodeLabLanguage[] = ["python", "java", "c", "cpp", "javascript", "csharp", "sql"];

function buildEmptyCodeMap(): Record<CodeLabLanguage, string> {
  return {
    python: "",
    java: "",
    c: "",
    cpp: "",
    javascript: "",
    csharp: "",
    sql: "",
  };
}

export const useCodeLabStore = create<CodeLabState>((set, get) => ({
  language: "python",
  signature: null,
  testCases: [],
  codeByLanguage: buildEmptyCodeMap(),
  isExecuting: false,
  consoleOutput: null,
  testResults: [],
  activeTab: "editor",
  pasteCount: 0,
  pasteEvents: [],
  typedCharCount: 0,
  sessionStartMs: Date.now(),
  submissionCount: 0,
  startedAt: "",

  initialize: (lang, sig, tests) => {
    // Generate starter code for all supported languages if not already present
    const codes = { ...get().codeByLanguage };
    
    ALL_LANGUAGES.forEach(l => {
      if (!codes[l]) {
        codes[l] = generateStarterCode(l, sig);
      }
    });

    set({
      language: lang,
      signature: sig,
      testCases: tests,
      codeByLanguage: codes,
      consoleOutput: null,
      testResults: [],
      activeTab: "editor",
      pasteCount: 0,
      pasteEvents: [],
      typedCharCount: 0,
      sessionStartMs: Date.now(),
      submissionCount: 0,
      startedAt: new Date().toISOString(),
    });
  },

  setLanguage: (lang) => set({ language: lang }),
  
  updateCode: (code) => set((state) => ({
    codeByLanguage: {
      ...state.codeByLanguage,
      [state.language]: code,
    },
  })),

  setExecuting: (exec) => set({ isExecuting: exec }),
  setConsoleOutput: (out) => set({ consoleOutput: out }),
  setTestResults: (results) => set({ testResults: results }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  addPasteEvent: (event) => set((state) => ({
    pasteEvents: [...state.pasteEvents, event],
    pasteCount: state.pasteCount + 1,
  })),

  incrementPasteCount: () => set((state) => ({
    pasteCount: state.pasteCount + 1,
  })),

  incrementTypedChars: (count: number) => set((state) => ({
    typedCharCount: state.typedCharCount + count,
  })),

  incrementSubmission: () => set((state) => ({
    submissionCount: state.submissionCount + 1,
  })),

  setStartedAt: (iso) => set({ startedAt: iso }),
}));
