const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Client } = require("pg");
const { transformSync } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));

const code = transformSync(fs.readFileSync("apps/web/src/lib/db.ts", "utf8"), {
  loader: "ts", format: "cjs",
}).code;

function poolConfig(url) {
  let config;
  vm.runInNewContext(code, {
    exports: {}, module: { exports: {} }, URL, console,
    process: { env: { DATABASE_URL: url, NODE_ENV: "development" } },
    require(name) {
      if (name === "@prisma/client") return { PrismaClient: class {} };
      if (name === "@prisma/adapter-pg") return { PrismaPg: class {} };
      if (name === "pg") return { Pool: class {
        constructor(options) { config = options; }
        on() {}
      } };
      throw new Error("Unexpected dependency");
    },
  });
  return config;
}

test("legacy SSL modes retain full verification without the driver deprecation warning", () => {
  for (const mode of ["prefer", "require", "verify-ca", "verify-full"]) {
    const config = poolConfig(`postgresql://user:password@db.example.test/lms?sslmode=${mode}&application_name=lms`);
    const url = new URL(config.connectionString);
    assert.equal(url.searchParams.get("sslmode"), "verify-full");
    assert.equal(url.searchParams.get("application_name"), "lms");
    assert.equal(url.password, "password");
    // Constructing a client parses TLS settings without opening a connection.
    const ssl = new Client(config).connectionParameters.ssl;
    assert.ok(ssl);
    assert.notEqual(ssl.rejectUnauthorized, false);
    assert.equal(ssl.checkServerIdentity, undefined);
  }
});

test("explicit libpq compatibility and disabled local TLS are preserved", () => {
  const compat = poolConfig("postgresql://user:password@db.example.test/lms?uselibpqcompat=true&sslmode=require");
  assert.equal(new URL(compat.connectionString).searchParams.get("sslmode"), "require");
  const local = poolConfig("postgresql://user:password@localhost/lms?sslmode=disable");
  assert.equal(new Client(local).connectionParameters.ssl, false);
});
