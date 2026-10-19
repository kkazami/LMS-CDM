# Narrow Sandbox runtime recovery — DISPATCH_BLOCKED

2026-10-09, Asia/Singapore. This is the newly authorized host-runtime recovery task; the previous completed repair task remains closed. Recovery was limited to diagnosis and one documented daemon restart. The approved provider is still unavailable. No worker booted, no harmless Codex session started, and no independent review was dispatched.

## Diagnosis and confidence

Observed before changing the host:

- Docker Engine responded with server version 29.6.2; C: had approximately 45.30 GB free. Disk-space, storage-directory, directory-permission and virtualization diagnostics passed.
- `sbx daemon status` showed stopped with `\\.\pipe\docker_kaname_sandboxd` disconnected. No `sbx`, `sandboxd` or `containerd` process was observed. The unrelated Codex Windows sandbox service was observed but was not altered.
- Approved executable/worker stayed `C:/Users/kirby/AppData/Local/DockerSandboxes/bin/sbx.exe` and `harness-repair-20261005`. Executable SHA-256 remained `a2c8d68f3a16851a65e1d43f7330ae6860c5a2f07df8f22fab5dae7a4a232780`, matching the earlier preflight. No binary upgrade/downgrade, broker/provider substitution or configuration change occurred.
- Endpoint `C:/Users/kirby/AppData/Local/DockerSandboxes/sandboxes/state/sandboxd/containerd/containerd.sock.ttrpc` existed, length 0, attribute value 1056 (includes ReparsePoint), creation 2026-10-05T13:37:15.6585743Z and unchanged last-write 2026-10-08T10:16:35.5865374Z.
- `Get-Acl`, `fsutil reparsepoint query` and read-only `icacls ... /L` each failed on that exact endpoint with Windows error 1920. Its parent directory ACL grants FullControl to the current user, Administrators and SYSTEM. Endpoint ACL/tag could not be read; no assumption that its ACL matches the parent is made.
- Filtered runtime logs and startup stderr repeatedly show backend initialization failing when removing/rebinding that endpoint. No live Sandboxes listener was demonstrated.

**Likely cause:** stale/inaccessible runtime socket or reparse-point state prevents Windows cleanup before the main ttrpc listener can bind. Confidence is moderate for that immediate failure mechanism. The exact reparse tag, underlying filesystem/driver condition, endpoint ACL/lock and whether the earlier full disk caused it remain unproven. There is no established need for an ACL change or credential refresh.

[Microsoft's error reference](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-) identifies 1920 as ERROR_CANT_ACCESS_FILE. A [Docker repository issue](https://github.com/docker/sbx-releases/issues/157) describes the same stale Windows socket/removal failure in an older version. That report corroborates a possible failure class; it does not prove this installation's root cause or supply a maintainer-approved v0.46.0 repair.

Diagnostic checks also warned about Binary version; daemon-dependent version/auth checks were skipped. Logs warned that `dndb` was unavailable and schema checking was skipped, then logged `database not open` during failed-start cleanup. These are additional host-level limitations, not proof of database corruption or an alternative cause established here. No runtime database was read, reset or migrated manually.

## Supported action, commands and result

Read-only diagnostic commands included:

```powershell
sbx daemon status
sbx diagnose --output json
sbx daemon restart --help
Get-Process / Get-CimInstance Win32_Process  # selected runtime identities only
Get-Item <exact-endpoint>
Get-Acl <exact-endpoint-and-parent>
fsutil reparsepoint query <exact-endpoint>
icacls <exact-endpoint> /L
docker info --format '{{json .ServerVersion}}'
```

Only status/name fields from structured diagnostics and selected startup/error lines from local logs were exposed. No diagnostic upload or message to Docker was performed, and no credential values, token stores, signing keys, live LMS environment files or private fixture data were inspected.

Docker's [supported troubleshooting procedure](https://docs.docker.com/ai/sandboxes/troubleshooting/) prescribes a daemon restart for repeated daemon errors and states that restart preserves sandbox data. The user expressly authorized that bounded action after diagnosis. The sole host recovery command was:

```powershell
& 'C:\Users\kirby\AppData\Local\DockerSandboxes\bin\sbx.exe' daemon restart
```

At 2026-10-09 11:13:48 Singapore time, the command reported stopping successfully and launching PID 32944, then returned **exit 1** because backend initialization failed with the same endpoint-access refusal. PID launch is not daemon health or provider-session success. Post-command `sbx daemon status` again reported stopped/disconnected, and no Sandboxes/containerd process remained.

Actual new refusal:

> failed to get listener for main ttrpc endpoint: remove … containerd.sock.ttrpc: The file cannot be accessed by the system.

The fresh startup banner/error at 03:13:48 UTC demonstrates the error recurred during this attempt, not only in historical log lines. [015-daemon-restart-attempt.json](015-daemon-restart-attempt.json) retains exact argv, timestamps, output and captured exit status. The containing shell returned successfully after collecting evidence; it does not override the recorded restart failure.

## Retry bound and startup/isolation outcome

- Daemon recovery/start attempts in this task: **1** of a maximum 3.
- Harmless Codex provider-session attempts: **0**; known repeated listener failure prevented safely reaching that step.
- Genuine isolated session ID: **null**; session provenance/output: **unavailable**.
- Observed worker boot/isolation evidence: **unavailable**; configured microVM/read-only flags are not represented as realized isolation.
- Independent review packets dispatched: **0**. No REVIEW_PASS/REVIEW_FAIL was produced.

The repeated endpoint-access failure is deterministic in the available evidence, not reasonably classified as transient. No delay/retry loop, additional startup attempt or native/shared-workspace fallback was used. The remaining two attempts are not a reason to repeat a known failure without a new supported recovery basis.

## Data/security impact and preservation

The restart may update provider logs/transient backend state through normal startup and reconciliation. The daemon was already stopped; no running Sandboxes workload was observed. No intentional data deletion, sandbox recreation, volume/container removal, WSL unregister, broad reset, state-directory relocation, endpoint deletion, ACL change, isolation-policy change, credential refresh or signing-key operation was performed. Docker Engine continued to respond afterward. This is not a comprehensive byte audit of all Docker internals.

All 195 pre-existing plan/review artifacts were hash-preserved, including the three packets and previous receipts. All 1,337 controlled-source files, seven frozen fixtures, corrected 012 package/evidence binding and controlled state/journal were rechecked unchanged. The feature run remains DRAFT/HIGH, next requirements, no claim/lease, approvals or accepted artifacts. LMS source/schema/database/tests/harness gates were untouched; no product or database tests ran.

Review-only OPEN-2 A and OPEN-5 C remain unchanged. Program Head remains an essential approved requirement deferred to V1.1/V2. No human identities/accounts/program IDs were fabricated and no account or credential was provisioned.

## Remaining action and stop boundary

The next documented escalation in Docker's generic troubleshooting is sandbox-state reset; that deletes sandbox data and is expressly outside this authorization. The older issue reporter's entire `sandboxd` state-directory rename is a workaround, not a supported current-version prescription, and could make persisted backend/provider state unavailable or require reconstruction. Neither action was performed. Deleting/replacing the endpoint or rewriting ACLs has no validated supported procedure or established security need in the current evidence.

A **vendor-supported, non-destructive repair specifically for the unreadable Windows endpoint**, with an explicit preservation/recovery plan for the existing provider state, is needed before further changes. If the only remedy is a reset/state relocation, it needs separate broader authorization and a verified data/credential/isolation preservation plan before execution; the current narrow authorization does not permit improvising it. No support message or automatic diagnostic upload has been sent.

Stop at **DISPATCH_BLOCKED**. No successful startup, isolation attestation, reviewer result, architecture PASS, new run, implementation lease or HIGH approval is claimed. After any separately authorized recovery, perform the harmless exact-provider isolation check first; dispatching the preserved three review packets still needs separate authorization as directed.
