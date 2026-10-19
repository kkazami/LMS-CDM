/**
 * code-wrappers.ts
 *
 * Server-side execution wrappers for student code.
 * Injects stdin-reading and result-printing runner harness around student functions
 * before sending to Judge0 for sandbox execution.
 *
 * Invariant: Student never sees the wrapper code in the Monaco editor.
 */

import { FuncSignature } from "./starter-code";

export type WrapperLanguage = "python" | "cpp" | "c" | "csharp" | "java" | "javascript" | "sql";

export function getWrapperLanguageFromId(id: number): WrapperLanguage {
  switch (id) {
    case 71: return "python";
    case 93: return "javascript";
    case 54: return "cpp";
    case 50: return "c";
    case 62: return "java";
    case 51: return "csharp";
    case 82: return "sql";
    default: return "python";
  }
}

/**
 * Wraps student code with standard I/O harness if necessary.
 *
 * @param lang - Programming language
 * @param studentCode - Student's function/program code
 * @param signature - Optional function signature for parameter parsing
 * @param stdin - Test case stdin input
 * @returns Full runnable program string for Judge0
 */
export function wrapStudentCode(
  lang: WrapperLanguage,
  studentCode: string,
  signature?: FuncSignature | null,
  stdin: string = ""
): string {
  const trimmed = studentCode.trim();

  switch (lang) {
    case "python": {
      // If student already provided a full script with input() or main guard, leave as-is
      if (trimmed.includes("if __name__") || trimmed.includes("input(") || trimmed.includes("sys.stdin")) {
        return studentCode;
      }

      // Universal Python runner harness that dynamically inspects and invokes the student's function
      const runner = `

if __name__ == "__main__":
    import sys, ast
    raw = sys.stdin.read().strip()
    funcs = [v for k, v in list(globals().items()) if callable(v) and not k.startswith('_') and hasattr(v, '__code__')]
    if funcs:
        fn = funcs[-1]
        import inspect
        sig = inspect.signature(fn)
        param_count = len(sig.parameters)
        args = []
        if raw:
            lines = [l for l in raw.split('\\n') if l]
            if len(lines) == param_count:
                for l in lines:
                    try:
                        args.append(ast.literal_eval(l.strip()))
                    except Exception:
                        args.append(l.strip())
            else:
                tokens = raw.split()
                if len(tokens) == param_count:
                    for t in tokens:
                        try:
                            args.append(ast.literal_eval(t))
                        except Exception:
                            args.append(t)
                elif param_count == 1:
                    try:
                        args.append(ast.literal_eval(raw))
                    except Exception:
                        args.append(raw)
        try:
            res = fn(*args)
            if res is not None:
                if isinstance(res, list):
                    print(" ".join(str(x) for x in res))
                elif isinstance(res, bool):
                    print(str(res).lower())
                else:
                    print(res)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
`;
      return studentCode + runner;
    }

    case "javascript": {
      if (trimmed.includes("process.stdin") || trimmed.includes("readline") || trimmed.includes("fs.readFileSync")) {
        return studentCode;
      }

      const funcMatch = studentCode.match(/function\s+([a-zA-Z0-9_$]+)/) ||
                         studentCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
      const fnName = signature?.name || (funcMatch ? funcMatch[1] : "solution");

      const runner = `

const fs = require('fs');
try {
    const rawInput = fs.readFileSync(0, 'utf-8').trim();
    const fn = (typeof ${fnName} === 'function') ? ${fnName} : null;
    if (fn) {
        let args = [];
        if (rawInput.length > 0) {
            const lines = rawInput.split('\\n').map(l => l.trim()).filter(Boolean);
            if (lines.length === fn.length) {
                args = lines.map(l => {
                    try { return JSON.parse(l); } catch { return !isNaN(l) ? Number(l) : l; }
                });
            } else {
                const tokens = rawInput.split(/\\s+/).filter(Boolean);
                if (tokens.length === fn.length) {
                    args = tokens.map(t => {
                        try { return JSON.parse(t); } catch { return !isNaN(t) ? Number(t) : t; }
                    });
                } else if (fn.length === 1) {
                    try { args = [JSON.parse(rawInput)]; } catch { args = [!isNaN(rawInput) ? Number(rawInput) : rawInput]; }
                }
            }
        }
        const result = fn(...args);
        if (result !== undefined) {
            if (Array.isArray(result)) {
                console.log(result.join(' '));
            } else {
                console.log(result);
            }
        }
    }
} catch (e) {
    console.error(e);
}
`;
      return studentCode + runner;
    }

    case "cpp": {
      if (trimmed.includes("int main(") || trimmed.includes("main(")) {
        return studentCode;
      }

      // Auto-extract function name if no signature is provided
      let fnName = signature?.name;
      let paramCount = signature?.params?.length || 0;

      if (!fnName) {
        const match = studentCode.match(/(\w+)\s*\(([^)]*)\)\s*\{/);
        if (match && match[1] !== "if" && match[1] !== "while" && match[1] !== "for") {
          fnName = match[1];
          const rawParams = match[2].trim();
          paramCount = rawParams ? rawParams.split(",").length : 0;
        }
      }

      const includes = `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <sstream>\nusing namespace std;\n`;

      if (!fnName) {
        return `${includes}\n${studentCode}\nint main() { return 0; }\n`;
      }

      // Build generic parameter reader for C++
      let readerHarness = "";
      if (signature && signature.params.length > 0) {
        const decls = signature.params.map(p => {
          if (p.type === "int") return `int ${p.name};\n    cin >> ${p.name};`;
          if (p.type === "float") return `double ${p.name};\n    cin >> ${p.name};`;
          if (p.type === "string") return `string ${p.name};\n    cin >> ${p.name};`;
          if (p.type === "boolean") return `bool ${p.name};\n    cin >> ${p.name};`;
          return `string ${p.name};\n    cin >> ${p.name};`;
        }).join("\n    ");
        readerHarness = `${decls}\n    auto result = ${fnName}(${signature.params.map(p => p.name).join(", ")});\n    cout << result << "\\n";`;
      } else if (paramCount === 2) {
        readerHarness = `int a, b;\n    if (cin >> a >> b) {\n        cout << ${fnName}(a, b) << "\\n";\n    }`;
      } else if (paramCount === 1) {
        readerHarness = `int a;\n    if (cin >> a) {\n        cout << ${fnName}(a) << "\\n";\n    }`;
      } else {
        readerHarness = `cout << ${fnName}() << "\\n";`;
      }

      return `${includes}\n${studentCode}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    ${readerHarness}\n    return 0;\n}\n`;
    }

    case "c": {
      if (trimmed.includes("int main(") || trimmed.includes("main(")) {
        return studentCode;
      }
      return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n\n${studentCode}\n\nint main() {\n    return 0;\n}\n`;
    }

    case "java": {
      let code = studentCode.trim();

      // 1. If code has "public class <ClassName>", normalize class name to Main for OpenJDK compiler
      code = code.replace(/public\s+class\s+([A-Za-z0-9_$]+)/g, (match, className) => {
        if (className !== "Main") return `public class Main`;
        return match;
      });

      if (!code.includes("class Main") && !code.includes("class Main ")) {
        if (/class\s+([A-Za-z0-9_$]+)/.test(code)) {
          code = code.replace(/class\s+([A-Za-z0-9_$]+)/, "public class Main");
        } else {
          code = `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n${code}\n}`;
        }
      }

      // 2. If code already has a main method, return normalized code
      if (code.includes("public static void main")) {
        return code;
      }

      // 3. Extract method name and parameters
      let fnName = signature?.name;
      let params = signature?.params;

      if (!fnName || !params) {
        const match = code.match(/public\s+static\s+(?:[\w<>[\],\s]+)\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
        if (match) {
          fnName = match[1];
          const rawParams = match[2].trim();
          if (rawParams) {
            params = rawParams.split(",").map((p) => {
              const parts = p.trim().split(/\s+/);
              const type = parts[0] as "int" | "float" | "string" | "boolean";
              const name = parts[1] || "arg";
              return { name, type };
            });
          } else {
            params = [];
          }
        }
      }

      const lastBraceIdx = code.lastIndexOf("}");
      if (lastBraceIdx === -1) return code;

      const readerStatements: string[] = [];
      const callArgs: string[] = [];

      if (params && params.length > 0) {
        params.forEach((p, idx) => {
          const varName = `arg_${idx}`;
          callArgs.push(varName);
          const t = String(p.type).toLowerCase();
          if (t === "int" || t === "integer") {
            readerStatements.push(`int ${varName} = sc.hasNextInt() ? sc.nextInt() : 0;`);
          } else if (t === "double" || t === "float") {
            readerStatements.push(`double ${varName} = sc.hasNextDouble() ? sc.nextDouble() : 0.0;`);
          } else if (t === "boolean") {
            readerStatements.push(`boolean ${varName} = sc.hasNextBoolean() ? sc.nextBoolean() : false;`);
          } else {
            readerStatements.push(`String ${varName} = sc.hasNext() ? sc.next() : "";`);
          }
        });
      }

      const callExpr = fnName ? `${fnName}(${callArgs.join(", ")})` : "";
      const mainMethod = `
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        try {
            ${readerStatements.join("\n            ")}
            ${fnName ? `Object result = ${callExpr};\n            if (result != null) System.out.println(result);` : ""}
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
`;

      return code.slice(0, lastBraceIdx) + mainMethod + "\n}";
    }

    case "csharp": {
      let code = studentCode.trim();

      // Normalize class name to Program
      code = code.replace(/public\s+class\s+([A-Za-z0-9_$]+)/g, (match, className) => {
        if (className !== "Program") return `public class Program`;
        return match;
      });

      if (!code.includes("class Program") && !code.includes("class Program ")) {
        if (/class\s+([A-Za-z0-9_$]+)/.test(code)) {
          code = code.replace(/class\s+([A-Za-z0-9_$]+)/, "public class Program");
        } else {
          code = `using System;\nusing System.Collections.Generic;\n\npublic class Program {\n${code}\n}`;
        }
      }

      if (code.includes("static void Main") || code.includes("static async Task Main")) {
        return code;
      }

      let fnName = signature?.name;
      if (!fnName) {
        const match = code.match(/public\s+(?:static\s+)?(?:\w+)\s+(\w+)\s*\(([^)]*)\)/);
        if (match) fnName = match[1];
      }

      const lastBraceIdx = code.lastIndexOf("}");
      if (lastBraceIdx !== -1 && fnName) {
        const mainMethod = `
    public static void Main() {
        string input = Console.ReadLine();
        if (!string.IsNullOrEmpty(input)) {
            var parts = input.Split(new char[]{' ', '\\t', '\\n'}, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2 && int.TryParse(parts[0], out int a) && int.TryParse(parts[1], out int b)) {
                Console.WriteLine(${fnName}(a, b));
            } else if (parts.Length >= 1 && int.TryParse(parts[0], out int x)) {
                Console.WriteLine(${fnName}(x));
            } else {
                Console.WriteLine(${fnName}());
            }
        } else {
            try {
                Console.WriteLine(${fnName}());
            } catch {}
        }
    }
`;
        return code.slice(0, lastBraceIdx) + mainMethod + "\n}";
      }

      return code;
    }

    case "sql": {
      return studentCode;
    }

    default:
      return studentCode;
  }
}
