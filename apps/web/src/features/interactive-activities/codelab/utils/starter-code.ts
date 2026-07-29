/**
 * starter-code.ts
 *
 * Generates function-signature stubs for selected languages based on the
 * instructor's defined function signature and parameter types.
 */

export type CodeLabLanguage = "python" | "java" | "c" | "cpp" | "javascript" | "csharp";

export const JUDGE0_LANGUAGE_IDS: Record<CodeLabLanguage, number> = {
  python: 71, // Python (3.8.1)
  java: 62,   // Java (OpenJDK 13.0.1)
  c: 50,      // C (GCC 9.2.0)
  cpp: 54,    // C++ (GCC 9.2.0)
  javascript: 93, // Node.js (18.15.0)
  csharp: 51  // C# (Mono 6.6.0.161)
};

export interface FuncParam {
  name: string;
  type: "int" | "float" | "string" | "boolean" | "int[]" | "string[]";
}

export interface FuncSignature {
  name: string;
  returnType: FuncParam["type"] | "void";
  params: FuncParam[];
}

export function generateStarterCode(lang: CodeLabLanguage, sig: FuncSignature): string {
  switch (lang) {
    case "python":
      return `def ${sig.name}(${sig.params.map(p => p.name).join(", ")}):\n    # Write your code here\n    pass\n`;
    case "javascript":
      return `function ${sig.name}(${sig.params.map(p => p.name).join(", ")}) {\n    // Write your code here\n}\n`;
    case "java":
      const javaParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `public class Main {\n    public static ${mapType(lang, sig.returnType)} ${sig.name}(${javaParams}) {\n        // Write your code here\n        return ${getDefaultReturn(lang, sig.returnType)};\n    }\n}\n`;
    case "c":
      const cParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `#include <stdio.h>\n#include <stdlib.h>\n#include <stdbool.h>\n#include <string.h>\n\n${mapType(lang, sig.returnType)} ${sig.name}(${cParams}) {\n    // Write your code here\n    return ${getDefaultReturn(lang, sig.returnType)};\n}\n`;
    case "cpp":
      const cppParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\n${mapType(lang, sig.returnType)} ${sig.name}(${cppParams}) {\n    // Write your code here\n    return ${getDefaultReturn(lang, sig.returnType)};\n}\n`;
    case "csharp":
      const csharpParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `using System;\n\npublic class Program {\n    public static ${mapType(lang, sig.returnType)} ${sig.name}(${csharpParams}) {\n        // Write your code here\n        return ${getDefaultReturn(lang, sig.returnType)};\n    }\n}\n`;
    default:
      return "";
  }
}

function mapType(lang: CodeLabLanguage, type: string): string {
  if (lang === "java") {
    switch (type) {
      case "int": return "int";
      case "float": return "double";
      case "string": return "String";
      case "boolean": return "boolean";
      case "int[]": return "int[]";
      case "string[]": return "String[]";
      case "void": return "void";
      default: return "void";
    }
  }
  if (lang === "c") {
    switch (type) {
      case "int": return "int";
      case "float": return "float";
      case "string": return "char*";
      case "boolean": return "bool";
      case "int[]": return "int*";
      case "string[]": return "char**";
      case "void": return "void";
      default: return "void";
    }
  }
  if (lang === "cpp") {
    switch (type) {
      case "int": return "int";
      case "float": return "double";
      case "string": return "string";
      case "boolean": return "bool";
      case "int[]": return "vector<int>";
      case "string[]": return "vector<string>";
      case "void": return "void";
      default: return "void";
    }
  }
  if (lang === "csharp") {
    switch (type) {
      case "int": return "int";
      case "float": return "double";
      case "string": return "string";
      case "boolean": return "bool";
      case "int[]": return "int[]";
      case "string[]": return "string[]";
      case "void": return "void";
      default: return "void";
    }
  }
  return type;
}

function getDefaultReturn(lang: CodeLabLanguage, type: string): string {
  if (type === "void") return "";
  if (type === "int" || type === "float") return "0";
  if (type === "boolean") return "false";
  if (type === "string") return '""';
  if (lang === "java" || lang === "csharp") return "null";
  if (lang === "cpp") return "{}";
  if (lang === "c") return "NULL";
  return "";
}
