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

export type WrapperLanguage = "python" | "cpp" | "csharp" | "java" | "javascript" | "sql";

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

      if (!signature) {
        return studentCode;
      }

      const paramDecls = signature.params.map((p) => {
        if (p.type === "int") return `int ${p.name};\n    cin >> ${p.name};`;
        if (p.type === "float") return `double ${p.name};\n    cin >> ${p.name};`;
        if (p.type === "string") return `string ${p.name};\n    cin >> ${p.name};`;
        if (p.type === "boolean") return `bool ${p.name};\n    cin >> ${p.name};`;
        return `string ${p.name};\n    cin >> ${p.name};`;
      }).join("\n    ");

      const runner = `

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    ${paramDecls}
    auto result = ${signature.name}(${signature.params.map(p => p.name).join(", ")});
    cout << result << "\\n";
    return 0;
}
`;
      return studentCode + runner;
    }

    case "java": {
      if (trimmed.includes("public static void main")) {
        return studentCode;
      }
      return studentCode;
    }

    case "csharp": {
      if (trimmed.includes("static void Main") || trimmed.includes("static async Task Main")) {
        return studentCode;
      }
      return studentCode;
    }

    case "sql": {
      // SQL uses SQLite 3.31.1 in Judge0.
      return studentCode;
    }

    default:
      return studentCode;
  }
}
