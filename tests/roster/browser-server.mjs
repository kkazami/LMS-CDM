import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const requireWeb = createRequire(path.resolve("apps/web/package.json"));
const next = requireWeb("next");
const app = next({
  dev: true,
  hostname: "127.0.0.1",
  port: Number(process.env.ROSTER_TEST_PORT),
  dir: process.env.ROSTER_TEST_APP_DIR,
  conf: {
    distDir: ".next",
    serverExternalPackages: ["officeparser", "pg", "@prisma/adapter-pg"],
  },
});
await app.prepare();
const handler = app.getRequestHandler();
const server = http.createServer((request, response) =>
  handler(request, response),
);
server.listen(Number(process.env.ROSTER_TEST_PORT), "127.0.0.1");
async function close() {
  server.close();
  await app.close();
  process.exit(0);
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
