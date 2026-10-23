import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSecurityHeaders } from "../security-headers";

function directives(): { name: string; sources: string[] }[] {
  const csp = getSecurityHeaders()["Content-Security-Policy"];
  return csp.split(";").map((part) => {
    const [name, ...sources] = part.trim().split(/\s+/);
    return { name, sources };
  });
}

function sourcesOf(name: string): string[] {
  const found = directives().filter((d) => d.name === name);
  assert.equal(found.length, 1, `${name} must appear exactly once`);
  return found[0].sources;
}

describe("Content-Security-Policy", () => {
  it("never repeats a directive (browsers ignore every occurrence after the first)", () => {
    const names = directives().map((d) => d.name);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    assert.deepEqual(duplicates, []);
  });

  it("frame-src keeps main's document-viewer sources and Practicum's YouTube embed host", () => {
    const frame = sourcesOf("frame-src");
    for (const required of [
      "'self'",
      "https://www.youtube.com",
      "https://view.officeapps.live.com",
      "blob:",
      "https://www.youtube-nocookie.com",
    ]) {
      assert.ok(frame.includes(required), `frame-src is missing ${required}`);
    }
  });

  it("frame-src stays narrow: no wildcard or blanket https:", () => {
    const frame = sourcesOf("frame-src");
    assert.ok(!frame.includes("*"));
    assert.ok(!frame.includes("https:"));
  });

  it("media-src allows uploaded Practicum videos, and clickjacking protection is intact", () => {
    assert.ok(sourcesOf("media-src").includes("https:"));
    assert.deepEqual(sourcesOf("frame-ancestors"), ["'none'"]);
  });
});
