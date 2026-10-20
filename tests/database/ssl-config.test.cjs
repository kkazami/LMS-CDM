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

function poolConfig(url, env = {}) {
  let config;
  vm.runInNewContext(code, {
    exports: {}, module: { exports: {} }, URL, console,
    process: { env: { DATABASE_URL: url, NODE_ENV: "development", ...env } },
    require(name) {
      if (name === "@prisma/client") return { PrismaClient: class {}, Prisma: { dmmf: { datamodel: {} } } };
      if (name === "node:crypto") return require("node:crypto");
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

test("remote connections cannot bypass verification through libpq compatibility or a misleading URL", () => {
  for (const url of [
    'postgresql://user:password@db.example.test/lms',
    'postgresql://localhost:password@db.example.test/lms?sslmode=disable',
    'postgresql://user:password@localhost.evil.test/lms?uselibpqcompat=true&sslmode=require',
  ]) {
    const config = poolConfig(url);
    assert.equal(new URL(config.connectionString).searchParams.get('sslmode'), 'verify-full');
    assert.notEqual(new Client(config).connectionParameters.ssl.rejectUnauthorized, false);
  }
});

test("explicit disabled local TLS is preserved", () => {
  const local = poolConfig("postgresql://user:password@localhost/lms?sslmode=disable");
  assert.equal(new Client(local).connectionParameters.ssl, false);
});

test("pool limits retain defaults and accept only a bounded explicit per-process budget", () => {
  const url = 'postgresql://synthetic@127.0.0.1/owned';
  assert.equal(poolConfig(url).max, 15);
  assert.equal(poolConfig(url, { NODE_ENV: 'production' }).max, 2);
  assert.equal(poolConfig(url, { NODE_ENV: 'production', DATABASE_POOL_MAX: '8' }).max, 8);
  for (const value of ['', '0', '-1', '21', '1.5', 'Infinity', '8connections']) assert.throws(() => poolConfig(url, { DATABASE_POOL_MAX: value }), /DATABASE_POOL_MAX/);
});
