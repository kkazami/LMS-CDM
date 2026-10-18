import * as fs from 'node:fs';
import { DockerRuntime } from './harness/docker-runtime';
import { ensure } from './harness/contracts';

try {
  const args = process.argv.slice(2), arg = (name: string) => { const i = args.indexOf('--' + name); return i < 0 ? undefined : args[i + 1]; };
  ensure(process.env.HARNESS_DOCKER_CLI && arg('record'), 'Supply host HARNESS_DOCKER_CLI and --record');
  const docker = new DockerRuntime(process.env.HARNESS_DOCKER_CLI);
  if (args[0] === 'postgres-start') {
    const record = docker.startPostgres(Number(arg('port')));
    fs.writeFileSync(arg('record')!, JSON.stringify(record, null, 2), { flag: 'wx' }); console.log(JSON.stringify(record));
  } else if (args[0] === 'postgres-stop') {
    const record = JSON.parse(fs.readFileSync(arg('record')!, 'utf8'));
    docker.removeOwned(record.name, record.owner); console.log('Removed only the owned disposable PostgreSQL container.');
  } else throw new Error('Use postgres-start or postgres-stop');
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
