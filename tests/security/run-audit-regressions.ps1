param([switch]$FullChecks)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runId = 'audit-' + [Guid]::NewGuid().ToString('N')
$scratchRoot = Join-Path $repoRoot "tmp/security-regressions/$runId"
$sourceRoot = Join-Path $scratchRoot 'source'
$fixtureRoot = Join-Path $scratchRoot 'fixture'
New-Item -ItemType Directory -Force -Path $sourceRoot,$fixtureRoot | Out-Null

# Copy only code/config needed by the fixture. No dotenv files or host credentials enter containers.
foreach ($relative in @('apps/web/src','packages/types/src','packages/api-client/src','prisma/super-user-v1','prisma/admin-mfa','prisma/migrations/20261115010000_admin_mfa')) {
  $destination = Join-Path $sourceRoot $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
  Copy-Item -LiteralPath (Join-Path $repoRoot $relative) -Destination $destination -Recurse
}
foreach ($relative in @('tests/security/audit-loader.cjs','tests/security/audit-regressions.test.cjs','tests/security/activity-grading.test.ts','tests/security/arduino-preview.test.ts','tests/security/admin-mfa.test.cjs','scripts/install-super-user-boundary.mjs')) {
  $destination = Join-Path $sourceRoot $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
  Copy-Item -LiteralPath (Join-Path $repoRoot $relative) -Destination $destination
}
Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*-cases.cjs' | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $sourceRoot 'tests/security')
}
if ($FullChecks) {
  & python (Join-Path $PSScriptRoot 'stage-full-checks.py') $repoRoot $sourceRoot
  if ($LASTEXITCODE -ne 0) { throw 'Full-check source staging failed' }
  New-Item -ItemType Directory -Force -Path (Join-Path $sourceRoot 'apps/mobile/node_modules'),(Join-Path $sourceRoot 'apps/desktop/node_modules'),(Join-Path $sourceRoot 'packages/api-client/node_modules'),(Join-Path $sourceRoot 'tmp'),(Join-Path $sourceRoot 'playwright') | Out-Null
}
Copy-Item -LiteralPath (Join-Path $repoRoot 'prisma/schema.prisma') -Destination (Join-Path $fixtureRoot 'schema.prisma')
New-Item -ItemType Directory -Force -Path (Join-Path $sourceRoot 'node_modules'),(Join-Path $sourceRoot 'apps/web/node_modules') | Out-Null
if (Get-ChildItem -LiteralPath $sourceRoot -Recurse -Force -File | Where-Object { $_.Name -like '.env*' }) { throw 'Credential-file staging denied' }

# Installed Prisma tool: SQL generation only, explicit standalone config, no repository config/dotenv.
$configPath = Join-Path $fixtureRoot 'prisma.config.mjs'
$schemaPath = Join-Path $fixtureRoot 'schema.prisma'
[IO.File]::WriteAllText($configPath, 'export default ' + (@{ schema=$schemaPath; datasource=@{url='postgresql://unused@127.0.0.1:1/unused'} } | ConvertTo-Json -Compress))
$nodePath = (Get-Command node).Source
$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $nodePath
$startInfo.WorkingDirectory = $fixtureRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.Environment.Clear()
foreach ($pair in @(@('SystemRoot',$env:SystemRoot),@('PATH',"$(Split-Path $nodePath);$env:SystemRoot/System32"),@('TEMP',$fixtureRoot),@('TMP',$fixtureRoot),@('HOME',$fixtureRoot),@('CHECKPOINT_DISABLE','1'),@('PRISMA_SCHEMA_ENGINE_BINARY',(Join-Path $repoRoot 'node_modules/.pnpm/@prisma+engines@7.9.1/node_modules/@prisma/engines/schema-engine-windows.exe')))) {
  $startInfo.Environment[$pair[0]] = $pair[1]
}
foreach ($argument in @((Join-Path $repoRoot 'node_modules/prisma/build/index.js'),'migrate','diff','--config',$configPath,'--from-empty','--to-schema',$schemaPath,'--script')) { $startInfo.ArgumentList.Add($argument) }
$process = [Diagnostics.Process]::new()
$process.StartInfo = $startInfo
[void]$process.Start()
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
if (-not $process.WaitForExit(60000)) { $process.Kill($true); throw 'Offline schema generation timed out' }
if ($process.ExitCode -ne 0) { throw "Offline schema generation failed: $($stderr.GetAwaiter().GetResult())" }
$ddl = $stdout.GetAwaiter().GetResult()
if ($ddl.Length -gt 8MB -or $ddl -notmatch 'CREATE TABLE') { throw 'Unexpected schema generation result' }
[IO.File]::WriteAllText((Join-Path $fixtureRoot 'schema.sql'), $ddl)

# Preserve pnpm's Windows absolute-link targets inside the Linux container.
$dependencyRoot = Join-Path $repoRoot 'node_modules'
$linuxDependencyRoot = '/mnt/host/' + $dependencyRoot.Substring(0,1).ToLower() + $dependencyRoot.Substring(2).Replace('\','/')
$webDependencies = Join-Path $repoRoot 'apps/web/node_modules'
$pgName = "$runId-pg"
$nodeName = "$runId-tests"
$exitCode = 2
try {
  & docker run -d --pull=never --name $pgName --label "lms.audit=$runId" --network none --read-only --user postgres --cap-drop ALL --security-opt no-new-privileges --memory 768m --cpus 1 --pids-limit 128 --ulimit 'nofile=512:512' --ulimit 'fsize=134217728:134217728' --tmpfs '/scratch:rw,nosuid,size=384m,mode=1777' --tmpfs '/tmp:rw,nosuid,noexec,size=16m' --tmpfs '/dev/shm:rw,nosuid,noexec,size=64m' --entrypoint /usr/bin/env postgres:17 -i 'PATH=/usr/lib/postgresql/17/bin:/usr/bin:/bin' HOME=/scratch TMPDIR=/tmp /bin/sh -c 'initdb -D /scratch/data --auth=trust --encoding=UTF8 --no-locale >/scratch/init.log && exec postgres -D /scratch/data -h 127.0.0.1 -c unix_socket_directories=/scratch -c shared_buffers=32MB -c max_connections=20 -c statement_timeout=15000 -c log_min_error_statement=panic' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL container did not start' }
  $ready = $false
  for ($attempt=0; $attempt -lt 20; $attempt++) {
    & docker exec $pgName /usr/lib/postgresql/17/bin/pg_isready -h 127.0.0.1 -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { $ready=$true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Disposable PostgreSQL startup deadline' }
  & docker exec $pgName /usr/lib/postgresql/17/bin/createdb -h 127.0.0.1 -U postgres audit_regression
  if ($LASTEXITCODE -ne 0) { throw 'Disposable database creation failed' }
  $arguments = @('run','--pull=never','--name',$nodeName,'--label',"lms.audit=$runId",'--network',"container:$pgName",'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','1536m','--cpus','2','--pids-limit','128','--ulimit','nofile=512:512','--ulimit','fsize=33554432:33554432','--tmpfs','/scratch:rw,nosuid,size=128m,mode=1777','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
    '--mount',"type=bind,source=$sourceRoot,target=/app,readonly",
    '--mount',"type=bind,source=$fixtureRoot,target=/fixture,readonly",
    '--mount',"type=bind,source=$dependencyRoot,target=$linuxDependencyRoot,readonly",
    '--mount',"type=bind,source=$dependencyRoot,target=/app/node_modules,readonly",
    '--mount',"type=bind,source=$webDependencies,target=/app/apps/web/node_modules,readonly",
    '--workdir','/app','--entrypoint','/usr/bin/env','node:22-bookworm-slim','-i',
    'PATH=/usr/local/bin:/usr/bin:/bin','HOME=/scratch','TMPDIR=/tmp','NODE_ENV=test','AUDIT_DISPOSABLE=1',
    'DATABASE_URL=postgresql://audit_app:dummy_fixture_only@127.0.0.1:5432/audit_regression',
    'DATABASE_POOL_MAX=4','ADMIN_MFA_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=','NEXT_TELEMETRY_DISABLED=1','timeout','180s','node','--require','./tests/security/audit-loader.cjs','--test','--test-concurrency=1','tests/security/audit-regressions.test.cjs','tests/security/activity-grading.test.ts','tests/security/arduino-preview.test.ts','tests/security/admin-mfa.test.cjs')
  $output = & docker @arguments 2>&1
  $exitCode = $LASTEXITCODE
  $output | ForEach-Object { Write-Output $_ }
  [IO.File]::WriteAllLines((Join-Path $scratchRoot 'test-output.txt'), [string[]]$output)
  $resultLine = $output | ForEach-Object { [string]$_ } | Where-Object { $_ -match 'AUDIT_RESULTS_JSON ' } | Select-Object -Last 1
  if ($resultLine) {
    $json = $resultLine.Substring($resultLine.IndexOf('AUDIT_RESULTS_JSON ') + 19)
    $records = $json | ConvertFrom-Json
    if ($records.Count -ne 6) { throw 'Expected six per-lead results' }
    [IO.File]::WriteAllText((Join-Path $scratchRoot 'results.json'), ($records | ConvertTo-Json -Depth 20))
  }
  Write-Output "RESULT_DIRECTORY=$scratchRoot"
  if ($FullChecks) {
    $fullArguments = @($arguments)
    $fullArguments[($fullArguments.IndexOf('--memory') + 1)] = '4g'
    $fullArguments[$fullArguments.IndexOf('node:22-bookworm-slim')] = 'docker/sandbox-templates:codex'
    $fullArguments[($fullArguments.IndexOf('--name') + 1)] = "$runId-full"
    $cut = $fullArguments.IndexOf('timeout')
    $fullArguments = @($fullArguments[0..($cut - 1)])
    $mountAt = $fullArguments.IndexOf('--workdir')
    $linuxRepoRoot = $linuxDependencyRoot.Substring(0, $linuxDependencyRoot.Length - '/node_modules'.Length)
    $extraMounts = @('--mount',"type=bind,source=$(Join-Path $sourceRoot 'packages'),target=$linuxRepoRoot/packages,readonly",
      '--mount',"type=bind,source=$(Join-Path $repoRoot 'packages/api-client/node_modules'),target=$linuxRepoRoot/packages/api-client/node_modules,readonly",
      '--tmpfs','/app/tmp:rw,nosuid,size=256m,mode=1777','--tmpfs','/app/playwright:rw,nosuid,size=128m,mode=1777',
      '--mount',"type=bind,source=$(Join-Path $repoRoot 'apps/mobile/node_modules'),target=/app/apps/mobile/node_modules,readonly",
      '--mount',"type=bind,source=$(Join-Path $repoRoot 'apps/desktop/node_modules'),target=/app/apps/desktop/node_modules,readonly")
    $fullArguments = @($fullArguments[0..($mountAt - 1)]) + $extraMounts + @($fullArguments[$mountAt..($fullArguments.Count - 1)]) + @('timeout','1200s','node','tests/security/full-checks.cjs')
    $fullOutput = & docker @fullArguments 2>&1
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    [IO.File]::WriteAllLines((Join-Path $scratchRoot 'full-checks-output.txt'), [string[]]$fullOutput)
    $fullOutput | ForEach-Object { Write-Output $_ }
  }
} finally {
  foreach ($container in @($nodeName,"$runId-full",$pgName)) {
    $label = & docker inspect --format '{{index .Config.Labels "lms.audit"}}' $container 2>$null
    if ($LASTEXITCODE -eq 0 -and $label -eq $runId) { & docker rm -f $container | Out-Null }
  }
}
exit $exitCode
