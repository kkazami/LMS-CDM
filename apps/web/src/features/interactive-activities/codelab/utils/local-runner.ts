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
 * Executes Python code locally using child_process.spawn (python3/python) with cloud fallback.
 */
export async function executePythonLocally(
  sourceCode: string,
  stdin: string = ""
): Promise<LocalExecutionResult> {
  const startTime = Date.now();

  const runProcess = (cmd: string): Promise<LocalExecutionResult | null> => {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let killed = false;

      let child;
      try {
        child = spawn(cmd, ["-u", "-c", sourceCode], { windowsHide: true });
      } catch {
        return resolve(null);
      }

      const timeout = setTimeout(() => {
        killed = true;
        try { child.kill("SIGKILL"); } catch { /* ignore */ }
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

      child.stdout.on("data", (data) => { stdout += data.toString(); });
      child.stderr.on("data", (data) => { stderr += data.toString(); });

      child.on("error", () => {
        clearTimeout(timeout);
        resolve(null);
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
  };

  // 1. Try local python binaries
  const res1 = await runProcess("python3");
  if (res1) return res1;
  const res2 = await runProcess("python");
  if (res2) return res2;

  // 2. Cloud CE Fallback (for Vercel serverless functions without local python)
  try {
    const cloudRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: 71,
        stdin: stdin || "",
      }),
    });
    if (cloudRes.ok) {
      const data = await cloudRes.json();
      return {
        stdout: data.stdout?.trimEnd() || null,
        stderr: data.stderr?.trimEnd() || null,
        compile_output: data.compile_output || null,
        time: data.time || "0.010",
        memory: data.memory || 15000,
        status: data.status || { id: 3, description: "Accepted" },
      };
    }
  } catch {
    // ignore
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
  return {
    stdout: null,
    stderr: "Python execution requires either network access to Judge0 Cloud or local Python installed.",
    compile_output: null,
    time: elapsed,
    memory: 0,
    status: { id: 11, description: "Runtime Error" },
  };
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

    child.on("close", async (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      if (code === 0) {
        resolve({
          stdout: stdout.trimEnd() || null,
          stderr: stderr.trimEnd() || null,
          compile_output: null,
          time: elapsed,
          memory: 15000,
          status: { id: 3, description: "Accepted" },
        });
      } else {
        resolve({
          stdout: stdout.trimEnd() || null,
          stderr: stderr.trimEnd() || `SQL Error exited with code ${code}`,
          compile_output: null,
          time: elapsed,
          memory: 15000,
          status: { id: 11, description: "SQL Error" },
        });
      }
    });

    child.on("error", async () => {
      // Cloud fallback for SQLite if local Python is not installed
      try {
        const cloudRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_code: sqlSource,
            language_id: 82,
          }),
        });
        if (cloudRes.ok) {
          const data = await cloudRes.json();
          return resolve({
            stdout: data.stdout?.trimEnd() || null,
            stderr: data.stderr?.trimEnd() || null,
            compile_output: data.compile_output || null,
            time: data.time || "0.010",
            memory: data.memory || 15000,
            status: data.status || { id: 3, description: "Accepted" },
          });
        }
      } catch {
        // ignore
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        stdout: null,
        stderr: "SQL execution requires either network access to Judge0 Cloud or local Python SQLite engine.",
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
 * Universal local execution router that handles Python, JavaScript, C#, SQL, and cloud fallbacks.
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
    // JavaScript (Node 18 vm sandbox)
    return executeJavaScriptLocally(sourceCode, stdin);
  }

  if (languageId === 51) {
    // C# (.NET)
    const csharpLocal = await executeCSharpLocally(sourceCode, stdin);
    if (csharpLocal.status.id !== 13 && !csharpLocal.stderr?.includes("dotnet error")) {
      return csharpLocal;
    }
  }

  if (languageId === 82) {
    // SQL (SQLite)
    return executeSqlLocally(sourceCode);
  }

  // Cloud CE fallback for C++, Java, C#, or other tracks when running without local compilers
  try {
    const cloudRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin: stdin || "",
        cpu_time_limit: 5.0,
        memory_limit: 128000,
      }),
    });

    if (cloudRes.ok) {
      const data = await cloudRes.json();
      return {
        stdout: data.stdout?.trimEnd() || null,
        stderr: data.stderr?.trimEnd() || null,
        compile_output: data.compile_output || null,
        time: data.time || "0.010",
        memory: data.memory || 20000,
        status: data.status || { id: 3, description: "Accepted" },
      };
    }
  } catch (cloudErr) {
    console.warn("Public Judge0 fallback request failed:", cloudErr);
  }

  const langName = LANGUAGE_NAMES[languageId] || `Language ID ${languageId}`;

  return {
    stdout: null,
    stderr: `Failed to execute ${langName}. Please ensure network connectivity to Judge0 Cloud or configure a local sandbox.`,
    compile_output: null,
    time: "0.010",
    memory: 0,
    status: { id: 11, description: "Runtime Error" },
  };
}
