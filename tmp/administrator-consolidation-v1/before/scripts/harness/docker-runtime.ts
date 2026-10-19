import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ensure } from './contracts';

/** Trusted host infrastructure only. Never export this executable or daemon to provider workers. */
export class DockerRuntime {
  constructor(readonly executable: string) {
    ensure(path.isAbsolute(executable) && fs.statSync(executable).isFile(), 'Explicit installed Docker CLI required');
  }
  call(args: string[], extra: NodeJS.ProcessEnv = {}): string {
    return execFileSync(this.executable, args, { shell: false, windowsHide: true, encoding: 'utf8', timeout: 180000,
      maxBuffer: 8_000_000, env: { ...process.env, ...extra } }).trim();
  }
  image(name: string): string {
    const digests = JSON.parse(this.call(['image', 'inspect', name, '--format', '{{json .RepoDigests}}'])) as string[];
    ensure(digests.length === 1 && /@sha256:[a-f0-9]{64}$/.test(digests[0]), 'Image must resolve to one immutable digest'); return digests[0];
  }
  startPostgres(port: number): { name: string; owner: string; image: string } {
    ensure(Number.isInteger(port) && port >= 1024 && port <= 65535, 'Explicit loopback PostgreSQL port required');
    ensure(process.env.HARNESS_POSTGRES_PASSWORD, 'Host-only disposable PostgreSQL password required');
    const owner = randomUUID(), name = 'harness-pg-' + owner, image = this.image('postgres:17');
    try { this.call(['run', '--detach', '--name', name, '--label', 'harness.owner=' + owner, '--user', 'postgres',
      '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=512m', '--pids-limit=128',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--tmpfs', '/var/run/postgresql:rw,nosuid,uid=999,gid=999,size=16m',
      '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,uid=999,gid=999,mode=0700,size=256m',
      '--publish', `127.0.0.1:${port}:5432`, '--env', 'POSTGRES_USER=harness', '--env', 'POSTGRES_DB=harness_admin',
      '--env', 'POSTGRES_PASSWORD', image], { POSTGRES_PASSWORD: process.env.HARNESS_POSTGRES_PASSWORD }); }
    catch (error) {
      // A failed port bind can leave a created container. Only remove our exact owned instance.
      const existing = this.call(['container', 'ls', '--all', '--filter', 'name=^/' + name + '$', '--format', '{{.Names}}']);
      if (existing === name) this.removeOwned(name, owner);
      throw error;
    }
    return { name, owner, image };
  }
  removeOwned(name: string, owner: string): void {
    ensure(/^harness-[a-z0-9-]+$/.test(name), 'Refuse unrelated container cleanup');
    const label = this.call(['inspect', name, '--format', '{{index .Config.Labels "harness.owner"}}']);
    ensure(label === owner, 'Container ownership changed; cleanup requires human reconciliation');
    this.call(['rm', '--force', name]);
  }
}
