# Windows / Sandboxes v0.46.0: error 1920 on containerd.sock.ttrpc persists after daemon restart

**Draft for human review — not submitted.** Prepared 2026-10-09. This report uses retained observations; no new diagnostics, restart or repair was executed to prepare it. Paths and account identifiers are redacted. We request a supported, non-destructive procedure that preserves the existing local sandbox/provider state.

## Summary

On this Windows host, Docker Engine responds, but the Docker Sandboxes daemon cannot initialize its backend. Startup fails while removing/rebinding its main ttrpc endpoint, `containerd.sock.ttrpc`, with Windows error 1920: “The file cannot be accessed by the system.” The endpoint exists, but metadata/security queries also fail on it. One documented daemon restart returned exit 1 with the same error. The daemon remains stopped; no isolated worker or Codex session started during the latest startup/recovery attempts.

The host previously ran out of storage and now has approximately 45.30 GB free. The endpoint error persisted after cleanup. We have not established whether the storage event caused or aggravated the endpoint problem.

## Observed environment

| Item | Retained observation |
|---|---|
| Host | Windows; exact edition/build not collected |
| Docker Engine | 29.6.2; read-only Engine API request succeeded |
| Docker Desktop application version | Not collected; do not infer it from Engine version |
| Docker Sandboxes CLI | v0.46.0, commit `991967dc90ce0d9a440cd1df1bdf3e395c5a2693` |
| Executable location, generalized | `%LOCALAPPDATA%\DockerSandboxes\bin\sbx.exe` |
| Available C: space | Approximately 45.30 GB / 42.2 GiB at the retained preflight |
| Daemon | Stopped; `\\.\pipe\docker_kaname_sandboxd` not connected |
| Relevant processes | No `sbx`, `sandboxd` or `containerd` process observed before recovery or after its failure |
| Runtime endpoint, generalized | `%LOCALAPPDATA%\DockerSandboxes\sandboxes\state\sandboxd\containerd\containerd.sock.ttrpc` |
| Endpoint metadata | Length 0; attributes 1056 include the ReparsePoint bit |
| Endpoint timestamps | Created 2026-10-05T13:37:15.6585743Z; last-write remained 2026-10-08T10:16:35.5865374Z after the failed restart |
| Endpoint tag/security details | Not readable; the exact reparse tag and endpoint ACL are unknown |
| Parent-directory ACL | Current user, Administrators and SYSTEM have FullControl; this does not prove the endpoint has the same ACL |

## Minimal reproduction on the affected retained state

These are commands **already observed**, with the private sandbox name replaced by `<existing-sandbox>`. This is not a reproduction from a fresh installation, and these steps have not been rerun for this draft.

1. Confirm versions and daemon status:

   ```powershell
   sbx version
   docker info --format '{{json .ServerVersion}}'
   sbx daemon status
   ```

   Engine responds; Sandboxes reports stopped/disconnected.

2. Attempt a harmless command in the existing sandbox:

   ```text
   sbx exec <existing-sandbox> node --version
   ```

   On 2026-10-09 at 03:06:29.677 UTC (11:06:29.677 Singapore time), startup failed before the worker command ran. Exit 1; provider session ID and worker probe result were null.

3. Apply the documented daemon-restart recovery once:

   ```powershell
   sbx daemon restart
   ```

   On 2026-10-09 at 03:13:48.099 UTC (11:13:48.099 Singapore time), it reported stopping successfully and launching a daemon process, then returned exit 1 by 03:13:50.359 UTC. The fresh startup failed with the same endpoint error. A subsequent status check showed stopped/disconnected again. Process launch was not a healthy daemon or successful worker session.

**Sanitized error excerpt** — the error wording is retained; the user-specific path prefix is replaced, and repeated historical startup banners are omitted:

```text
error: failed to start backend in-process: start backend: starting server:
failed to get listener for main ttrpc endpoint:
remove %LOCALAPPDATA%\DockerSandboxes\sandboxes\state\sandboxd\containerd\containerd.sock.ttrpc:
The file cannot be accessed by the system.

error: daemon exited unexpectedly: exit status 1
```

Read-only `Get-Acl`, `fsutil reparsepoint query` and `icacls <endpoint> /L` each failed on this same endpoint with error 1920. [Microsoft identifies 1920 as ERROR_CANT_ACCESS_FILE](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-).

## Retained local diagnostic summary

This is a curated summary of the previously observed `sbx diagnose --output json` and filtered local logs, **not a fresh diagnostic bundle or verbatim generated GitHub issue report**:

| Check | Recorded result |
|---|---|
| CLI binary, virtualization, mkfs.erofs | Pass |
| Storage directories, directory permissions, disk space | Pass |
| Daemon | Fail |
| Binary version | Warn; detailed reason not retained in the curated evidence |
| Daemon diagnostics, daemon/CLI version match, authentication | Skipped; no authentication conclusion is available |
| CLI “Socket” check | Pass; this must not be interpreted as proof that the failing internal ttrpc listener was operational |

Selected logs also warn that `dndb` was unavailable and schema-version checking was skipped, then report `database not open` during failed-start cleanup. We do not know whether these are relevant to the endpoint failure or secondary cleanup warnings. They do not establish database corruption.

## Related report and uncertainty

[docker/sbx-releases issue #157](https://github.com/docker/sbx-releases/issues/157) reports a similar Windows stale-socket/removal error, including `containerd.sock.ttrpc`, in v0.30.0. Its primary issue differs from this failure. We cite it as a related report only: it is not proof of the cause here or an applicable v0.46.0 fix. The reporter's whole-state-directory rename workaround was **not attempted** and is not being presented as a supported procedure.

Our working hypothesis is inaccessible/stale socket or reparse-point state preventing listener cleanup/rebinding. The actual tag, underlying filesystem/driver condition, endpoint ACL/lock and causal role of storage exhaustion remain unproven. Parent ACL checks do not justify changing permissions.

## Questions for maintainers

1. **Supported v0.46.0 recovery:** What supported sequence diagnoses and repairs this exact inaccessible main ttrpc endpoint after a failed daemon restart? What additional read-only evidence distinguishes stale socket state, a filesystem/reparse problem, an ACL/lock issue and an installation defect? Please identify a procedure validated for this Windows version of Sandboxes.
2. **Expected Windows representation:** Is this endpoint expected to have the ReparsePoint attribute? What tag, metadata-query behavior and cleanup/rebinding behavior should be expected? Is error 1920 on these read-only queries diagnostic of a known issue, and is it distinct from ordinary access denied?
3. **Non-destructive repair:** Can the endpoint be recovered while preserving the existing sandbox identities, VM files/disks, backend metadata, workspace bindings, policies, configurations and credential-proxy state? If a targeted operation is supported, please specify exact scope, required privileges, preconditions, verification and rollback; we will not infer safety from a manual deletion or rename workaround.
4. **Reset consequences:** If reset is unavoidable, exactly which sandbox data, container/image/volume state, registry/identity records, configurations, custom policies, templates/caches and credential/secret/authentication state are lost, retained or invalidated? If a preserve-secrets option applies to v0.46.0, what precisely does it preserve, and what does it not preserve? Does reset affect unrelated Docker Desktop/Engine containers, volumes or authentication? We request answers before executing any reset.
5. **Official preservation/reconstruction:** Which backup/export or stopped-state preservation steps are supported when the daemon cannot start? How can we verify a complete backup without exposing secret values, restore or reconstruct the existing provider's sandbox configuration and isolation, and safely roll back if recovery fails? Please identify any unsupported copying of internal databases or state directories, required version compatibility and secure handling of credentials.

We followed the restart step in [Docker's troubleshooting documentation](https://docs.docker.com/ai/sandboxes/troubleshooting/). That page describes reset as deleting sandbox data and documents local report formats. We have not reset, generated/uploaded a new bundle, or assumed the older issue's workaround is safe.

## Preservation boundary and requested response

We stopped after the repeated endpoint failure. No endpoint/state-directory delete or rename, ACL change, additional service restart, runtime reset, credential refresh, provider upgrade/downgrade/substitution, WSL unregister or unrelated container/volume removal was performed. Existing review packets and historical evidence were preserved. No native/shared-workspace fallback or architecture verdict is claimed.

Please provide a vendor-supported non-destructive recovery procedure, or explicitly state that none is available and describe the required preservation plan and data/security impacts before a destructive alternative. Raw logs, account-specific paths, application/source payloads, tokens, credentials, signing keys and private verification data are intentionally omitted. Any requested additional diagnostic collection or submission will require human review and redaction before sharing.
