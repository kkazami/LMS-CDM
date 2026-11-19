# Sprint 1 dependency security

19 November 2026. Tracks SUP-01/03 in [the roadmap](../../SECURITY-ROADMAP.md). Full advisory IDs, affected versions, paths, raw-report hashes and parent-package dependency contracts are retained in [sprint-1-dependency-results.json](sprint-1-dependency-results.json). The original November reports and lockfile evidence remain unchanged.

## Current before and after

Both scopes were queried against the same registry during this sprint, using pnpm 10.32.1, a manifest-only disposable workspace, an empty allowlisted environment and disabled package lifecycle scripts. No dotenv, npm credentials, application code, production data or provider secrets were sent. `pnpm audit` exited 1 in every scan because advisories remain; these are valid reports, not successful clean scans.

| Scope | Before: low / moderate / high / critical | After: low / moderate / high / critical | Reported matches |
|---|---|---|---|
| `pnpm audit --prod --json` | 6 / 18 / 25 / 1 | 0 / 4 / 2 / 0 | **50 → 6** |
| `pnpm audit --json` | 13 / 48 / 54 / 2 | 3 / 14 / 13 / 1 | **117 → 31** |

The advisory-object entries number 50→6 for production and 114→28 for all dependencies; the all-dependency reported severity totals count additional affected-version/path matches. Preserve both metrics rather than treating object count and severity totals as interchangeable. These are package-graph observations, **not demonstrated application exploits**.

The November 17 raw reports had 49 production matches and 116 all-dependency matches; its FINAL.json also recorded 113 advisory objects. Some historical prose used different severity distributions. The raw dated report, its checksum and its own metadata are the evidence; Sprint 1 neither rewrites it nor compares a new scan only against old advisory data.

## Compatible updates implemented

| Package | Locked change | Relevant dependency path / compatibility |
|---|---|---|
| Next.js | 16.4.2 → **16.4.6** | `apps/web > next`; existing major retained, direct manifest minimum raised; addresses the currently reported Next advisories. |
| Electron | 41.0.3 → **41.10.7** | `apps/desktop > electron`; existing major retained. Some remaining advisories require 42; a development dependency can still be the shipped desktop runtime. |
| shell-quote | 1.8.3 → **1.12.0** | `mobile > react-native > react-devtools-core > shell-quote`; parent accepts `^1.6.1`. Removes the currently matched critical production-graph advisory without claiming a shipped exploit. |
| node-forge | 1.3.3 → **1.4.3** | Expo CLI/certificate-tool parents accept `^1.3.3`. |
| brace-expansion | 1.1.12→**1.1.22**, 2.1.4→**2.1.8**, 5.0.4→**5.0.13** | Existing minimatch major contexts retained; each consuming parent accepts the selected same-major range. |
| picomatch | 2.3.1 → **2.3.2** | Jest-util/micromatch accept `^2.2.3`/`^2.3.1`; existing 4.0.7 contexts are unchanged. |
| js-yaml | 4.1.1 → **4.3.2** | Expo xcpretty and desktop builder parents accept `^4.1.0`; no forced YAML major 5 migration. |
| compression | 1.8.1 → **1.8.2** | Expo CLI accepts `^1.7.4`. |
| ip-address | 10.7.0 → **10.7.6** | Desktop socks chain accepts `^10.1.1`. |
| browserslist | 4.28.1 → **4.29.6** | Build-tool parents accept compatible 4.x; the resolved graph deduplicates the prior 4.28.1/4.29.4 contexts to 4.29.6. |
| baseline-browser-mapping | older 2.10.8/2.11.30 contexts → **2.11.38** | Next/browser build tooling; compatible 2.x update. |

New transitive selectors in `pnpm-workspace.yaml` match only the old affected versions; prior web parser, storage, Prisma and worklet overrides remain intact. They are **not global major-version overrides**. `pnpm-lock.yaml` was resolved with scripts disabled and a separate frozen install completed with scripts disabled. No Expo SDK, React, React Native, Prisma or builder major was changed. No `pnpm audit fix --force`, advisory suppression, paid service or architecture change was used.

Reference advisories: [shell-quote](https://github.com/advisories/GHSA-w7jw-789q-3m8p), [Next cache disclosure](https://github.com/advisories/GHSA-mfr8-8qww-v76h), [desktop tar](https://github.com/advisories/GHSA-23hp-3jrh-7fpw). Patched minima differ between advisories for the same package; the retained machine report contains every currently matched range.

## Remaining risks and upgrade decisions

| Package/path | Current exposure classification | Required change / decision |
|---|---|---|
| `desktop > electron-builder@25.1.8 > app-builder-lib > tar@6.2.1` | Desktop packaging/build infrastructure; **one critical and multiple high/moderate advisory matches remain**. Not a web-runtime package, but build-agent archive processing matters. | Current tar advisories require 7.5.21 for the strongest reported minimum; app-builder-lib itself requires >=26.15.0 for its own advisory. A coherent builder **26.x** upgrade needs owner approval and packaged artifact/signing/update compatibility tests. Do not force tar 7 into builder 25. |
| `desktop > electron@41.10.7` | Potentially shipped Chromium/Node desktop runtime despite devDependency classification. Remaining high/moderate/low matches. | Remaining advisories require **>=42.11.16**; current 42.x metadata includes 42.11.18. Approve an Electron major upgrade and packaged navigation/IPC/printing/MFA checks before distribution. |
| `desktop > builder-util-runtime@9.2.10` | Packaging/download tooling, high advisory. | Parent builder 25 pins an older compatible line; >=9.7.0 is reported patched. Include in the coherent builder upgrade; no unreviewed exact-parent override. |
| Expo CLI and `puppeteer-core > chromium-bidi > zod@3.25.76` | Native development/build tooling and root browser-automation tools. Production graph classification does not make Expo CLI a deployed web service. | Advisory requires **Zod >=4.6.6**. Upstream consumer migration is needed; replacing Zod 3 globally with 4 can break schema/error APIs. Review compatible upstream package releases. |
| `mobile > expo-router > query-string > decode-uri-component@0.2.2` | Mobile routing code may be bundled into the native/web client. High/moderate matches; shipped reachability is unverified. | Reported patched **>=0.5.1** crosses the current pre-1.0 compatibility line. Review a supported Expo/router/query-string upgrade; do not force it beneath an old consumer. |
| `xcode > uuid@7.0.3`, development ngrok > uuid@3.4.0 | Native build/dev tooling; moderate advisory. | Patched **>=11.1.1** requires multi-major API/module compatibility review through the parent packages. |
| Expo CLI `glob@13.0.6`, desktop `config-file-ts > glob@10.5.0`; minimatch 9/10 | Native/desktop build tooling, moderate matches. | Reported patches require **glob >=14.0.2** and **minimatch >=11.0.1**. Follow supported parent upgrades; don't change exported APIs by force. |

Do not declare any path unreachable merely from package placement. Native packaging, dev servers exposed on a LAN, CI artifact processing and the actual runtime bundle can change exposure. No malicious input or blocked security validation was executed to establish reachability.

## Verification and local use

See [Sprint 1 results](sprint-1-results.md) and [permitted test scope](../../tests/sprint-1/README.md). Ordinary dependency API smoke checks cover package resolution, Next JSON responses, quoting round trips, Forge hashing, compression, YAML, matchers, address parsing and browser targets. They are compatibility tests, not advisory-specific exploit tests. Web/mobile/desktop typechecks and synthetic CodeLab/grading/MFA units provide additional scoped regression evidence; they do not prove native signed artifacts or production isolation.

Compatibility was checked with the **new disposable frozen install**, not the old main-workspace `node_modules`. Before local development, install from the new lockfile and regenerate Prisma through the normal approved local setup. Production installation/build/promotion belongs to the operator's approved release; no deployed application was changed. Full builds that invoke configured database setup must not be run against an unapproved production target just to obtain a green build.

No individual ASVS requirement is promoted to verified by lower advisory counts. Keep SUP-01 partially implemented until remaining packages, exceptions, supported native artifacts and ongoing update ownership have evidence.
