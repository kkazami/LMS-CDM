// Explicit live-service check: synthetic code only, no app/database credentials.
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));

(async () => {
  delete process.env.JUDGE0_AUTH_TOKEN;
  delete process.env.RAPIDAPI_KEY;
  delete process.env.JUDGE0_RAPIDAPI_KEY;
  process.env.JUDGE0_URL = "https://ce.judge0.com";
  const result = await build({ stdin: { contents: `export {executeJudge0Submission} from './apps/web/src/features/interactive-activities/codelab/utils/judge0-config'; export {wrapStudentCode} from './apps/web/src/features/interactive-activities/codelab/utils/code-wrappers';`, resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "cjs" });
  const compiled = new Module(path.resolve("tmp/runner-smoke.cjs"), module); compiled.filename = path.resolve("tmp/runner-smoke.cjs"); compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  const { executeJudge0Submission, wrapStudentCode } = compiled.exports;
  const cases = [
    ["cpp", 54, '#include <iostream>\n#include <string>\nint main(){std::string s;std::getline(std::cin,s);std::cout<<s;}'],
    ["java", 62, 'public class Main { public static void main(String[] args) { java.util.Scanner s=new java.util.Scanner(System.in); System.out.print(s.nextLine()); } }'],
    ["csharp", 51, 'using System; class Program { static void Main() { Console.Write(Console.ReadLine()); } }'],
    ["python", 71, 'print(input())'],
    ["javascript", 93, "const fs=require('fs');console.log(fs.readFileSync(0,'utf8').trim());"],
    ["sql", 82, "SELECT 'CodeLab smoke test';"],
  ];
  for (const [language, id, source] of cases) {
    const run = await executeJudge0Submission(wrapStudentCode(language, source, null, "CodeLab smoke test"), id, "CodeLab smoke test");
    assert.equal(run.status.id, 3, `${language}: ${run.compile_output || run.stderr || run.status.description}`);
    assert.equal(run.stdout.trim(), "CodeLab smoke test", language);
    console.log(`${language}: sandbox compilation/execution and output OK`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
