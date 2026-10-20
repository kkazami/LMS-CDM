const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));

const code = transformSync(fs.readFileSync("apps/web/src/features/interactive-activities/codelab/utils/judge0-config.ts", "utf8"), { loader: "ts", format: "cjs" }).code;
const encoded = text => Buffer.from(text).toString("base64");
function runner(replies, env = { JUDGE0_RAPIDAPI_KEY: 'synthetic-key' }, clock) {
  const module = { exports: {} }, calls = [];
  vm.runInNewContext(code, { module, exports: module.exports, Buffer, URL, process: { env }, AbortSignal,
    Date: clock || Date, setTimeout: resolve => { resolve(); },
    fetch: async (url, options) => {
      calls.push({ url, options });
      const next = replies.shift();
      if (next instanceof Error) throw next;
      assert.ok(next, "Unexpected extra provider request");
      return { ok: (next.http || 200) < 400, json: async () => next.body };
    },
  });
  return { api: module.exports, calls };
}

test("waits for queued/processing submissions and decodes UTF-8 output for every track", async () => {
  for (const language of [54, 62, 51, 71, 93, 82]) {
    const r = runner([{ body: { token: "job-123" } }, { body: { status: { id: 1 } } }, { body: { status: { id: 2 } } },
      { body: { stdout: encoded("Hello 世界\n"), time: "0.01", status: { id: 3, description: "Accepted" } } }]);
    const result = await r.api.executeJudge0Submission("synthetic source", language, "input");
    assert.equal(result.stdout, "Hello 世界\n"); assert.equal(result.status.id, 3);
    const body = JSON.parse(r.calls[0].options.body);
    assert.equal(Buffer.from(body.source_code, "base64").toString(), "synthetic source");
    assert.equal(body.language_id, language); assert.equal(body.enable_network, false);
    assert.match(r.calls[0].url, /wait=false/); assert.equal(r.calls.length, 4);
  }
});

test("compile errors and runtime errors remain student diagnostics", async () => {
  for (const id of [5, 6, 11]) {
    const r = runner([{ body: { status: { id, description: "Diagnostic" }, compile_output: id === 6 ? encoded("Syntax error") : null, stderr: id === 11 ? encoded("Runtime failure") : null } }]);
    const result = await r.api.executeJudge0Submission("bad code", 54);
    assert.equal(result.status.id, id);
    if (id === 6) assert.equal(result.compile_output, "Syntax error");
  }
});

test("provider errors, malformed replies and internal sandbox failures are service errors", async () => {
  for (const reply of [new Error("network failure"), { http: 401 }, { http: 429 }, { http: 503 }, { body: {} }, { body: { status: { id: 13 } } }]) {
    const r = runner([reply]);
    await assert.rejects(r.api.executeJudge0Submission("code", 54), error => error instanceof r.api.CodeRunnerUnavailableError);
  }
});

test("queue polling has an overall deadline", async () => {
  let time = 0;
  const r = runner(Array.from({ length: 10 }, () => ({ body: { token: "job-123", status: { id: 2 } } })), { JUDGE0_RAPIDAPI_KEY: 'synthetic-key' }, class extends Date { static now() { time += 10_001; return time; } });
  await assert.rejects(r.api.executeJudge0Submission("code", 54), error => error instanceof r.api.CodeRunnerUnavailableError);
  assert.ok(r.calls.length < 10);
});

test("configured provider failures do not resend code or credentials to another provider", async () => {
  const r = runner([{ http: 503 }], { JUDGE0_URL: "https://runner.example.test", JUDGE0_AUTH_TOKEN: "synthetic-token", RAPIDAPI_KEY: "synthetic-key" });
  await assert.rejects(r.api.executeJudge0Submission("code", 54));
  assert.equal(r.calls.length, 1); assert.ok(r.calls[0].url.startsWith("https://runner.example.test/"));
  assert.equal(r.calls[0].options.headers["X-Auth-Token"], "synthetic-token");
  assert.equal(r.calls[0].options.headers["X-RapidAPI-Key"], undefined);
  const rapid = runner([], { JUDGE0_RAPIDAPI_KEY: "synthetic-key" });
  assert.equal(rapid.api.getJudge0BaseUrl(), "https://judge0-ce.p.rapidapi.com");
});

test('missing credentials and unsafe or public-demo destinations fail before sending source code', async () => {
  for (const env of [{}, { JUDGE0_URL: 'https://runner.example.test' },
    ...['http://localhost:2358', 'http://runner.example.test', 'https://ce.judge0.com', 'https://user:pass@runner.example.test', 'https://runner.example.test/path', 'https://runner.example.test?key=secret', 'https://runner.example.test#fragment', 'not a URL'].map(JUDGE0_URL => ({ JUDGE0_URL, JUDGE0_AUTH_TOKEN: 'synthetic-token' }))]) {
    const r = runner([], env);
    await assert.rejects(r.api.executeJudge0Submission('private student code', 71), error => error instanceof r.api.CodeRunnerUnavailableError);
    assert.equal(r.calls.length, 0);
  }
});

test('managed RapidAPI sends only its own credentials and never follows redirects', async () => {
  const r = runner([{ body: { status: { id: 3 }, stdout: encoded('ok') } }], { JUDGE0_RAPIDAPI_KEY: 'synthetic-key', JUDGE0_AUTH_TOKEN: 'other-provider-token' });
  await r.api.executeJudge0Submission('synthetic', 71);
  assert.equal(r.calls[0].options.headers['X-RapidAPI-Key'], 'synthetic-key');
  assert.equal(r.calls[0].options.headers['X-RapidAPI-Host'], 'judge0-ce.p.rapidapi.com');
  assert.equal(r.calls[0].options.headers['X-Auth-Token'], undefined);
  assert.equal(r.calls[0].options.redirect, 'error');
});
