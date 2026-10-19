import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../../workers/invitation-scheduler/worker.mjs";

test("External scheduler uses HTTPS, POST and a secret header, rejects redirects and surfaces failures", async () => {
  const original = globalThis.fetch;
  const env = {
    LMS_EMAIL_ENDPOINT:
      "https://lms.example.invalid/api/internal/email/process",
    CRON_SECRET: "synthetic-secret-".repeat(4),
  };
  try {
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url.href, env.LMS_EMAIL_ENDPOINT);
      assert.equal(options.method, "POST");
      assert.equal(options.redirect, "manual");
      assert.equal(options.headers.Authorization, "Bearer " + env.CRON_SECRET);
      assert.ok(options.signal);
      return new Response("{}");
    };
    await worker.scheduled({}, env);
    assert.equal(calls, 1);
    await assert.rejects(() =>
      worker.scheduled(
        {},
        {
          ...env,
          LMS_EMAIL_ENDPOINT:
            "http://lms.example.invalid/api/internal/email/process",
        },
      ),
    );
    await assert.rejects(() =>
      worker.scheduled({}, { ...env, CRON_SECRET: "" }),
    );
    assert.equal(calls, 1);
    globalThis.fetch = async () => new Response("", { status: 503 });
    await assert.rejects(() => worker.scheduled({}, env), /HTTP 503/);
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.redirect, 'manual');
      return new Response(null, { status: 302, headers: { Location: 'https://another.example.invalid/' } });
    };
    await assert.rejects(() => worker.scheduled({}, env), /HTTP 302/);
  } finally {
    globalThis.fetch = original;
  }
});
