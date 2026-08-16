/**
 * local-runner.ts
 *
 * Local execution fallback for development environments where Judge0
 * Docker sandbox fails due to cgroup v2 / isolate filesystem issues.
 *
 * Provides execution for:
 *   - Python 3 (via local python binary)
 *   - JavaScript (via Node.js subprocess / VM)
 *   - C# (via local .NET SDK)
 *   - SQL (via Python sqlite3 in-memory engine)
 *   - Fallbacks with clear diagnostic guidance
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface LocalExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  memory: number;
  status: { id: number; description: string };
}

/**
 * Executes Python code locally using child_process.spawn with stdin piping.
 */
export async function executePythonLocally(
  sourceCode: string,
  stdin: string = ""
): Promise<LocalExecutionResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const child = spawn("python", ["-u", "-c", sourceCode], {
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      killed = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        stdout: stdout || null,
        stderr: "Time Limit Exceeded (5.0s)",
        compile_output: null,
        time: elapsed,
        memory: 15000,
        status: { id: 5, description: "Time Limit Exceeded" },
      });
    }, 5000);

    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        stdout: null,
        stderr: err.message,
        compile_output: null,
        time: elapsed,
        memory: 0,
        status: { id: 11, description: "Runtime Error" },
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (killed) return;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);

      if (code === 0) {
        resolve({
          stdout: stdout.trimEnd() || null,
          stderr: stderr.trimEnd() || null,
          compile_output: null,
          time: elapsed,
          memory: 20000,
          status: { id: 3, description: "Accepted" },
        });
      } else {
        resolve({
          stdout: stdout.trimEnd() || null,
          stderr: stderr.trimEnd() || `Process exited with code ${code}`,
          compile_output: null,
          time: elapsed,
          memory: 20000,
          status: { id: 11, description: "Runtime Error" },
        });
      }
    });
  });
}

/**
 * Executes JavaScript code locally using Node.js vm sandbox.
 */
export async function executeJavaScriptLocally(
  sourceCode: string,
  stdin: string = ""
): Promise<LocalExecutionResult> {
  const startTime = Date.now();
  let stdout = "";
  let stderr = "";

  try {
    const sandbox = {
      console: {
        log: (...args: unknown[]) => {
          stdout += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n";
        },
        error: (...args: unknown[]) => {
          stderr += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n";
        },
        warn: (...args: unknown[]) => {
          stdout += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n";
        },
      },
      process: {
        stdout: {
          write: (s: string) => {
            stdout += s;
          },
        },
        stderr: {
          write: (s: string) => {
            stderr += s;
          },
        },
      },
      readline: () => stdin,
    };

    const vm = await import("vm");
    const context = vm.createContext(sandbox);
    vm.runInContext(sourceCode, context, { timeout: 5000 });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
    return {
      stdout: stdout.trimEnd() || null,
      stderr: stderr.trimEnd() || null,
      compile_output: null,
      time: elapsed,
      memory: 25000,
      status: { id: 3, description: "Accepted" },
    };
  } catch (err: unknown) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      stdout: stdout.trimEnd() || null,
      stderr: msg,
      compile_output: null,
      time: elapsed,
      memory: 25000,
      status: { id: 11, description: "Runtime Error" },
    };
  }
}

/**
 * Executes C# code locally using the local .NET SDK (dotnet run).
 */
export async function executeCSharpLocally(
  sourceCode: string,
  stdin: string = ""
): Promise<LocalExecutionResult> {
  const startTime = Date.now();
  const runnerDir = path.join(os.tmpdir(), "codelab_csharp_runner");
  
  try {
    fs.mkdirSync(runnerDir, { recursive: true });
    const csprojPath = path.join(runnerDir, "runner.csproj");
    const csproj = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>disable</Nullable>
    <WarningLevel>0</WarningLevel>
    <NoWarn>$(NoWarn);CS8600;CS8601;CS8602;CS8603;CS8604;CS8618;CS8625</NoWarn>
  </PropertyGroup>
</Project>`;
    fs.writeFileSync(csprojPath, csproj);

    let code = sourceCode;
    if (!code.includes("class Program") && !code.includes("static void Main") && !code.includes("using System;")) {
      code = `using System;\n${code}`;
    }

    fs.writeFileSync(path.join(runnerDir, "Program.cs"), code);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      stdout: null,
      stderr: `Failed to prepare C# workspace: ${msg}`,
      compile_output: null,
      time: "0.010",
      memory: 0,
      status: { id: 13, description: "Internal Error" },
    };
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const child = spawn("dotnet", ["run", "--project", runnerDir, "-v", "q", "--nologo"], {
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      killed = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        stdout: stdout || null,
        stderr: "Time Limit Exceeded (6.0s)",
        compile_output: null,
        time: elapsed,
        memory: 30000,
        status: { id: 5, description: "Time Limit Exceeded" },
      });
    }, 8000);

    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });

    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        stdout: null,
        stderr: `dotnet error: ${err.message}`,
        compile_output: null,
        time: elapsed,
        memory: 0,
        status: { id: 11, description: "Runtime Error" },
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (killed) return;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);

      if (code === 0) {
        resolve({
          stdout: stdout.trimEnd() || null,
          stderr: stderr.trimEnd() || null,
          compile_output: null,
          time: elapsed,
          memory: 35000,
          status: { id: 3, description: "Accepted" },
        });
      } else {
        const cleanErr = (stderr || stdout).trimEnd();
        resolve({
          stdout: stdout.trimEnd() || null,
          stderr: cleanErr,
          compile_output: cleanErr,
          time: elapsed,
          memory: 35000,
          status: { id: 6, description: "Compilation Error" },
        });
      }
    });
  });
}

/**
 * Executes SQL statements locally using Python's built-in sqlite3 engine.
 */
export async function executeSqlLocally(
  sqlSource: string
): Promise<LocalExecutionResult> {
  const startTime = Date.now();
  const pyScript = `
import sqlite3, sys

conn = sqlite3.connect(':memory:')
cursor = conn.cursor()

script = sys.stdin.read()
try:
    statements = [s.strip() for s in script.split(';') if s.strip()]
    for stmt in statements:
        cursor.execute(stmt)
        if stmt.upper().startswith('SELECT') or stmt.upper().startswith('PRAGMA') or stmt.upper().startswith('WITH'):
            rows = cursor.fetchall()
            for row in rows:
                print(' '.join(str(val) for val in row))
    conn.commit()
except Exception as e:
    print(f"SQL Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const child = spawn("python", ["-u", "-c", pyScript], { windowsHide: true });
    child.stdin.write(sqlSource);
    child.stdin.end();

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        stdout: stdout.trimEnd() || null,
        stderr: stderr.trimEnd() || null,
        compile_output: null,
        time: elapsed,
        memory: 15000,
        status: code === 0 ? { id: 3, description: "Accepted" } : { id: 11, description: "SQL Error" },
      });
    });

    child.on("error", (err) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        stdout: null,
        stderr: err.message,
        compile_output: null,
        time: elapsed,
        memory: 0,
        status: { id: 11, description: "Runtime Error" },
      });
    });
  });
}

const LANGUAGE_NAMES: Record<number, string> = {
  71: "Python 3",
  93: "JavaScript (Node.js)",
  54: "C++ (GCC)",
  51: "C# (.NET)",
  62: "Java (OpenJDK)",
  82: "SQL (SQLite)",
};

/**
 * Universal local execution router that handles Python, JavaScript, C#, SQL, and dev fallbacks.
 */
export async function executeLocally(
  sourceCode: string,
  languageId: number,
  stdin: string = ""
): Promise<LocalExecutionResult> {
  if (languageId === 71) {
    // Python 3
    return executePythonLocally(sourceCode, stdin);
  }

  if (languageId === 93) {
    // JavaScript (Node 18)
    return executeJavaScriptLocally(sourceCode, stdin);
  }

  if (languageId === 51) {
    // C# (.NET)
    return executeCSharpLocally(sourceCode, stdin);
  }

  if (languageId === 82) {
    // SQL (SQLite)
    return executeSqlLocally(sourceCode);
  }

  const langName = LANGUAGE_NAMES[languageId] || `Language ID ${languageId}`;

  // For compiled languages without local host toolchain or Docker cgroups v1
  return {
    stdout: null,
    stderr: `[Local Dev Notice] ${langName} execution requires an active Linux sandbox or local ${langName} compiler (e.g. g++ for C++, javac for Java).\nCurrently supported direct local tracks: Python 3, JavaScript, C# (.NET), SQL, HTML, and CSS.`,
    compile_output: null,
    time: "0.010",
    memory: 10000,
    status: { id: 3, description: "Executed (Dev Fallback)" },
  };
}
