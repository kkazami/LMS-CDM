# Sprint 2 dependency remediation â€” 19 November 2026

Base: approved Sprint 1 checkpoint `b8f5d4b7da704f76d2abeae8748d012d0115a7ba`; fixes remain a reviewed working tree on that base. Public registry reports apply to the frozen lockfile below, not a production deployment. Lifecycle scripts were disabled during the manifest-only install; target tests/builds ran offline separately.

| Graph | Before | After | Critical before â†’ after | High before â†’ after |
|---|---:|---:|---:|---:|
| Production dependencies | 6 | 3 | 0 â†’ 0 | 2 â†’ 1 |
| All workspaces, including development | 31 | 5 | 1 â†’ 0 | 13 â†’ 1 |

Counts are pnpm advisory **matches**, including paths; advisory objects are 28 â†’ 4. One remaining high advisory and four moderate matches keep both scans at exit 1. There are zero remaining critical matches in this snapshot. Desktop Electron is listed as a dev dependency but ships in the desktop app; dev classification does not make it harmless.

Before lock SHA-256: `c2752589fc67da45d60f7d97da2a90e0b2fd6fb20ec950556e940783bb9f27fb`. After: `df21d4eeac438ada020416c7a60f534578ceb5c69f6f3926f3c4c1dfe96f4894`.

## Changes and compatibility

| Component | Before â†’ resolved | Rationale / evidence |
|---|---|---|
| Electron | 41.10.7 â†’ 42.11.18 | Owner-approved major; official [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security); explicit client regressions and unsigned Windows package check. |
| electron-builder / app-builder-lib | 25.1.8 â†’ 26.18.0 | Owner-approved major; removes tar 6 and old download/build helpers. Official [builder CLI](https://www.electron.build/cli/); locally packaged without publishing or signing credentials. |
| Expo / router | 57.0.31 / 57.0.29 â†’ 57.0.33 / 57.0.31 | SDK 57 retained. Compatible Metro runtime 57.0.18, Constants 57.0.24, Linking 57.0.14 aligned to new peers. No Expo 58 migration. |
| Expo sharing / splash | 57.0.24 / 57.0.10 â†’ 57.0.26 / 57.0.11 | Supported SDK 57 patches select updated config plugins/xcode, eliminating old glob and uuid-7 paths. Native behavior still needs device checks. |
| Puppeteer | 25.10.0 â†’ 25.18.1 | Owner explicitly approved its internal Zod 3 â†’ 4 replacement; chromium-bidi resolves patched Zod 4.6.6. Imports/connect/launch API and schema smoke test pass without launching a browser. Application Zod/business schemas were not migrated. |

Exact official npm metadata, peers, integrity values and resolver receipts remain under `tmp/security-sprint-2/`; [machine inventory](sprint-2-dependency-results.json) preserves every prior/remaining advisory path and patched range. No forced incompatible override, package removal, waiver or advisory suppression was added. The old socks/ip-address compatibility assertion is not applicable to this graph after its parent build tooling removed that dependency; Sprint 1 test bytes are preserved.

## Remaining advisories

| Package / path | Severity | Patched requirement | Disposition |
|---|---|---|
| `mobile > expo-router > query-string > decode-uri-component@0.2.2` | High and moderate | High requires >=0.5.1; moderate >=0.5.0 | SDK-57 router still requests query-string 7, which requests the old decoder. Do not force a new decoder major underneath it. Seek a supported upstream router/query-string fix; any SDK migration requires approval. Avoid adding custom untrusted query-string parsing. This is a shipped mobile JS dependency; current source/tests do not disprove exposure. Release gate remains red. |
| `mobile > @expo/ngrok > uuid@3.4.0` | Moderate | >=11.1.1 | Tunnel development tooling; compatible ngrok release still declares uuid 3. Preserve tunnel feature, keep off production application hosts, and monitor upstream replacement. Forced major override is not compatibility evidence. |
| `desktop > electron-builder > app-builder-lib > minimatch@10.2.6` and `@electron/universal > minimatch@9.0.9` | Moderate (2 matches) | >=11.0.1 | Build/mac universal tooling. Supported parent versions still constrain older majors. Build only in disposable restricted CI, use trusted packaging input, seek supported upstream updates; do not silently override both majors. |

## Every prior advisory

Affected versions/paths and published patched ranges below come from the fresh baseline registry response. A cleared result means the after scan no longer reports that advisory/path; it is not a claim that the old defect was exploited or that all runtime attack paths were tested.

| Advisory / package | Baseline affected versions and dependency paths | Patched range from advisory | Result / relevance |
|---|---|---|
| [GHSA-34x7-hfp2-rc4v](https://github.com/advisories/GHSA-34x7-hfp2-rc4v) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.7` | Cleared from after scan; Desktop build tooling |
| [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.3` | Cleared from after scan; Desktop build tooling |
| [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.8` | Cleared from after scan; Desktop build tooling |
| [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.10` | Cleared from after scan; Desktop build tooling |
| [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.11` | Cleared from after scan; Desktop build tooling |
| [GHSA-r6q2-hw4h-h46w](https://github.com/advisories/GHSA-r6q2-hw4h-h46w) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.4` | Cleared from after scan; Desktop build tooling |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) / uuid (moderate) | `3.4.0`: `apps__mobile>@expo/ngrok>uuid`; `7.0.3`: `apps__mobile>expo-splash-screen>@expo/config-plugins>xcode>uuid` | `>=11.1.1` | Unresolved/partially reduced; Mobile dev/build tooling; only ngrok path remains |
| [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh) / tar (moderate) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.16` | Cleared from after scan; Desktop build tooling |
| [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp) / tar (moderate) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.18` | Cleared from after scan; Desktop build tooling |
| [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) / tar (critical) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.19` | Cleared from after scan; Desktop build tooling |
| [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.18` | Cleared from after scan; Desktop build tooling |
| [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) / tar (moderate) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.17` | Cleared from after scan; Desktop build tooling |
| [GHSA-p2f4-r6v6-j797](https://github.com/advisories/GHSA-p2f4-r6v6-j797) / builder-util-runtime (high) | `9.2.10`: `apps__desktop>electron-builder>builder-util-runtime` | `>=9.7.0` | Cleared from after scan; Desktop build tooling |
| [GHSA-7g7r-gx96-252g](https://github.com/advisories/GHSA-7g7r-gx96-252g) / app-builder-lib (high) | `25.1.8`: `apps__desktop>electron-builder>app-builder-lib` | `>=26.15.0` | Cleared from after scan; Desktop build tooling |
| [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) / tar (high) | `6.2.1`: `apps__desktop>electron-builder>app-builder-lib>tar` | `>=7.5.21` | Cleared from after scan; Desktop build tooling |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) / decode-uri-component (moderate) | `0.2.2`: `apps__mobile>expo-router>query-string>decode-uri-component` | `>=0.5.0` | Unresolved/partially reduced; Shipped mobile router |
| [GHSA-fw47-9c62-h3vw](https://github.com/advisories/GHSA-fw47-9c62-h3vw) / electron (moderate) | `41.10.7`: `apps__desktop>electron` | `>=42.11.3` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-2p8c-gr87-2676](https://github.com/advisories/GHSA-2p8c-gr87-2676) / electron (moderate) | `41.10.7`: `apps__desktop>electron` | `>=42.11.3` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-x562-297c-g43g](https://github.com/advisories/GHSA-x562-297c-g43g) / electron (moderate) | `41.10.7`: `apps__desktop>electron` | `>=42.11.9` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-98mx-cjp9-gchm](https://github.com/advisories/GHSA-98mx-cjp9-gchm) / electron (low) | `41.10.7`: `apps__desktop>electron` | `>=42.11.1` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-3qxv-5xgr-q7w9](https://github.com/advisories/GHSA-3qxv-5xgr-q7w9) / electron (low) | `41.10.7`: `apps__desktop>electron` | `>=42.11.6` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-h3v5-h239-pg29](https://github.com/advisories/GHSA-h3v5-h239-pg29) / electron (low) | `41.10.7`: `apps__desktop>electron` | `>=42.11.6` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-997q-gvvc-jwmx](https://github.com/advisories/GHSA-997q-gvvc-jwmx) / electron (moderate) | `41.10.7`: `apps__desktop>electron` | `>=42.11.3` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) / zod (high) | `3.25.76`: `.>puppeteer-core>chromium-bidi>zod` | `>=4.6.6` | Cleared from after scan; Root browser-test tooling |
| [GHSA-jr5w-w6x2-84p9](https://github.com/advisories/GHSA-jr5w-w6x2-84p9) / electron (high) | `41.10.7`: `apps__desktop>electron` | `>=42.11.16` | Cleared from after scan; Shipped desktop runtime |
| [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f) / decode-uri-component (high) | `0.2.2`: `apps__mobile>expo-router>query-string>decode-uri-component` | `>=0.5.1` | Unresolved/partially reduced; Shipped mobile router |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) / glob (moderate) | `13.0.6`: `apps__mobile>expo>@expo/cli>glob`; `10.5.0`: `apps__desktop>electron-builder>app-builder-lib>config-file-ts>glob` | `>=14.0.2` | Cleared from after scan; Mobile/desktop build tooling |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) / minimatch (moderate) | `9.0.9`: `apps__desktop>electron-builder>app-builder-lib>@electron/universal>minimatch`; `10.2.4`: `apps__desktop>electron-builder>app-builder-lib>minimatch` | `>=11.0.1` | Unresolved/partially reduced; Desktop build tooling |

## Limits

Remaining baseline peer warning: lucide-react-native 0.468.0 declares React <=18 while SDK 57 uses React 19.2.3. It predates these changes; icons were retained. Deprecated transitive tooling remains. Native/iOS distribution, provider images/services, browser engine system packages and production images require their own evidence. This is a dependency inventory, not an exploitability or complete-supply-chain assurance.

The CycloneDX 1.6 lockfile inventory contains 1,476 components and 1,477 dependency nodes including the root, all workspaces and platform/optional/build packages. It records package integrity and graph edges; license completeness and OS/native application SBOMs remain open. See [automation](automated-security-checks.md).
