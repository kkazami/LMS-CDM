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

  // Actions
  initialize: (lang: CodeLabLanguage, sig: FuncSignature, tests: TestCase[]) => void;
  setLanguage: (lang: CodeLabLanguage) => void;
  updateCode: (code: string) => void;
  setExecuting: (exec: boolean) => void;
  setConsoleOutput: (out: CodeSubmissionResponse | null) => void;
  setTestResults: (results: TestCaseResult[]) => void;
  setActiveTab: (tab: "editor" | "console" | "tests") => void;
}

export const useCodeLabStore = create<CodeLabState>((set, get) => ({
  language: "python",
  signature: null,
  testCases: [],
  codeByLanguage: {
    python: "",
    java: "",
    c: "",
    cpp: "",
    javascript: "",
    csharp: "",
  },
  isExecuting: false,
  consoleOutput: null,
  testResults: [],
  activeTab: "editor",

  initialize: (lang, sig, tests) => {
    // Generate starter code for all supported languages if not already present
    const codes = { ...get().codeByLanguage };
    const langs: CodeLabLanguage[] = ["python", "java", "c", "cpp", "javascript", "csharp"];
    
    langs.forEach(l => {
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
}));
