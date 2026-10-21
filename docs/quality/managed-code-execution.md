# Managed CodeLab execution and PR #51 CI repair

Updated 21 October 2026. The user selected a managed compatible service instead of maintaining the legacy Judge0 image. This change prepares the adapter and retires the repository's self-hosted stack. It does not create a subscription, configure production secrets, migrate an existing deployment, stop any containers or certify a provider's security.

## Confirmed causes

- [Harness job](https://github.com/kkazami/LMS-CDM/actions/runs/39481272020/job/118830159522): the rehearsal stopped at `Unsupported source link/directory: .orchestra/local-worktrees/super-user-v1`. Two accidentally tracked gitlinks had no entries in .gitmodules, also producing a checkout-cleanup warning. Remove only their index entries and ignore the local worktree directory; retain both actual folders. The harness source checks remain enforced.
- [Web product run](https://github.com/kkazami/LMS-CDM/actions/runs/39481272046): the product job passed its regression suite, typecheck, production build and scoped dependency gate. Container scans failed on findings, not a failed scanner installation.
- The old Judge0 1.13.1 image reported 1,953 high/critical findings in its Debian 10.2 target alone, plus findings in bundled tools. The Redis image reported two OpenSSL package findings. The PostgreSQL image reported 25 findings in the Go standard library embedded in gosu. These counts are historical scan observations, not counts of proven remotely exploitable application defects.

The owner authorized replacing that stack with a maintained compatible service. The compose file and unused local-runner module have therefore been removed. Their three image scan jobs are retired because these images are no longer configured or shipped for CodeLab. This does **not** mean those images were patched or that their scan results became clean. No vulnerability ignore list, severity reduction or continue-on-error was introduced. Product dependency checks and runner boundary/contract tests remain mandatory.

## Provider choice and configuration

The compatible managed option prepared here is official Judge0 CE through RapidAPI. It preserves the existing submissions API instead of requiring a new student-code protocol. The [official Judge0 SDK](https://github.com/judge0/judge0-python) documents the RapidJudge0CE client, and [RapidAPI authentication documentation](https://docs.rapidapi.com/v2/docs/configuring-api-authentication) describes its key and host headers. The [Judge0 API documentation](https://ce.judge0.com/docs) defines submissions, Base64 output, asynchronous status polling and authentication.

Choose one configuration, in protected server environment variables:

| Option | Required settings | Behavior |
|---|---|---|
| Official managed CE | JUDGE0_RAPIDAPI_KEY | Uses https://judge0-ce.p.rapidapi.com with X-RapidAPI-Key and X-RapidAPI-Host |
| Reviewed compatible managed provider | JUDGE0_URL and JUDGE0_AUTH_TOKEN | Uses that HTTPS origin with X-Auth-Token; requires the same submissions contract |

RAPIDAPI_KEY remains a legacy alias. No key is checked into source. Do not use NEXT_PUBLIC variables. A custom origin cannot contain a path, query, fragment or embedded credentials. HTTP and the public ce.judge0.com demo are rejected. Credentials are not forwarded to another provider after errors or redirects.

**Do not merge/deploy this runtime change before supplying and validating the provider configuration.** Missing configuration deliberately returns a service-unavailable error. No provider key was found among the named settings in the local dotenv files during this repair; this does not inspect or establish the state of hosting secrets.

A managed API transfers maintenance of the execution infrastructure to a provider. It does not prove patch status, capacity, availability, data retention or contractual security. Review these with the actual service owner. No plan or price is assumed, and no purchase has been made. Confirm that sending student source code to the selected third party is acceptable under the institution's policies before enabling real use.

## Compatibility and safety retained

- Browser calls still use the LMS API; provider credentials remain on the server.
- Submissions use Base64 encoding and asynchronous polling; queued and processing statuses remain supported.
- The existing tracks use language IDs 54 (C++), 62 (Java), 51 (C#), 71 (Python), 93 (JavaScript) and 82 (SQL). Verify these IDs and their versions against the selected provider's languages endpoint. Contract fixtures are not proof that every provider supports them.
- Code execution requests disable network access. Confirm the provider enforces its sandbox settings.
- Four pending executions per warm web process and the 30-second overall execution deadline remain unchanged. This is not a global quota across server instances.
- Provider authentication, quota, network or internal sandbox failures remain service failures, rather than a failed student solution or a reason to execute code on the LMS host.
- The unreferenced local-runner module, including its direct public-demo and host-execution paths, was deleted after searching its callers. No native mobile source is changed.

## Deployment acceptance

1. An operator selects/approves the provider, account, region, privacy/retention terms and usage limits. Store its key in the hosting secrets for the intended environment. Record the account owner without copying the key into reports.
2. Test on isolated staging, with a provider sandbox/test account where available. Confirm authentication, allowed languages, asynchronous polling, Unicode output, compiler/runtime diagnostics, timeouts and quota handling. Confirm an outage does not award or remove academic credit.
3. Run the optional synthetic live smoke tool only with CODELAB_LIVE_SMOKE_APPROVED=synthetic-only and the selected provider settings in the process environment. Command: `node tests/codelab/runner-live-smoke.cjs`. It submits synthetic programs for six tracks, consumes provider quota, does not load dotenv automatically and refuses implicit public-demo use. Do not run it against real student code or an unapproved provider.
4. Perform the existing staged CodeLab workload with provider metrics and adopted budgets; include worker queue and rate-limit behavior. Do not infer capacity from ordinary dashboard reads.
5. Deploy only the reviewed configuration/candidate, verify a synthetic LMS journey and retain a rollback plan. No live success is claimed until these checks run.

Existing self-hosted installations are an operator migration task: restrict access to the old service, inventory usage and any data it retains, cut over through staging, verify the replacement and then stop the old services. Preserve database volumes/backups until the owner approves retention/disposal. Deleting the compose file from Git does not stop running services or delete their data. Do not restart the vulnerable stack as an undocumented rollback.

## Evidence boundary

Local verification for this repair: 90 product tests passed without failures/skips; 69 harness safety tests passed; harness and web TypeScript checks passed. Both former local-worktree directories remain present after removing their gitlinks. The staged diff passed whitespace and targeted credential-pattern checks. These are local results, not live provider or GitHub deployment evidence.

The original [quality report](web-lms-2026-10/report.md) and [defense guide](web-lms-2026-10/defense-guide.md) retain the historical candidate and measured results. This follow-up changes runner configuration and repository tracking. It does not remeasure the 400/1,000-client workload, upgrade its verdict or establish a 5,000-account capacity. Actual GitHub results for the repaired commit must be checked before claiming CI passes. Live provider execution remains unverified until configured and tested.
