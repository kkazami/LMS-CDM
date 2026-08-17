/**
 * starter-code.ts
 *
 * Generates function-signature stubs for selected languages based on the
 * instructor's defined function signature and parameter types.
 */

export type CodeLabLanguage =
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "javascript"
  | "csharp"
  | "sql"
  | "html"
  | "css";

export const JUDGE0_LANGUAGE_IDS: Record<CodeLabLanguage, number> = {
  python: 71,     // Python (3.8.1)
  java: 62,       // Java (OpenJDK 13.0.1)
  c: 50,          // C (GCC 9.2.0)
  cpp: 54,        // C++ (GCC 9.2.0)
  javascript: 93, // Node.js (18.15.0)
  csharp: 51,     // C# (Mono 6.6.0.161)
  sql: 82,        // SQLite (3.31.1)
  html: 0,        // Browser sandbox iframe preview
  css: 0,         // Browser sandbox iframe preview
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

export function generateStarterCode(lang: CodeLabLanguage, sig?: FuncSignature | null): string {
  switch (lang) {
    case "html":
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My Page</title>\n</head>\n<body>\n  <!-- Write your HTML here -->\n\n</body>\n</html>\n`;

    case "css":
      return `/* Write your CSS here */\nbody {\n  \n}\n`;

    case "python":
      if (!sig || sig.params.length === 0) {
        return `# Write your Python code here\n`;
      }
      return `def ${sig.name}(${sig.params.map(p => p.name).join(", ")}):\n    # Write your code here\n    pass\n`;

    case "javascript":
      if (!sig || sig.params.length === 0) {
        return `// Write your JavaScript code here\n`;
      }
      return `function ${sig.name}(${sig.params.map(p => p.name).join(", ")}) {\n    // Write your code here\n}\n`;

    case "java": {
      if (!sig || sig.params.length === 0) {
        return `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`;
      }
      const javaParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `public class Main {\n    public static ${mapType(lang, sig.returnType)} ${sig.name}(${javaParams}) {\n        // Write your code here\n        return ${getDefaultReturn(lang, sig.returnType)};\n    }\n}\n`;
    }

    case "c": {
      if (!sig || sig.params.length === 0) {
        return `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`;
      }
      const cParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `#include <stdio.h>\n#include <stdlib.h>\n#include <stdbool.h>\n#include <string.h>\n\n${mapType(lang, sig.returnType)} ${sig.name}(${cParams}) {\n    // Write your code here\n    return ${getDefaultReturn(lang, sig.returnType)};\n}\n`;
    }

    case "cpp": {
      if (!sig || sig.params.length === 0) {
        return `#include <iostream>\n\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`;
      }
      const cppParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\n${mapType(lang, sig.returnType)} ${sig.name}(${cppParams}) {\n    // Write your code here\n    return ${getDefaultReturn(lang, sig.returnType)};\n}\n`;
    }

    case "csharp": {
      if (!sig || sig.params.length === 0) {
        return `using System;\n\npublic class Program {\n    public static void Main() {\n        // Write your code here\n    }\n}\n`;
      }
      const csharpParams = sig.params.map(p => `${mapType(lang, p.type)} ${p.name}`).join(", ");
      return `using System;\n\npublic class Program {\n    public static ${mapType(lang, sig.returnType)} ${sig.name}(${csharpParams}) {\n        // Write your code here\n        return ${getDefaultReturn(lang, sig.returnType)};\n    }\n}\n`;
    }

    case "sql":
      return `-- Write your SQL query below\nSELECT * FROM table_name;\n`;

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
