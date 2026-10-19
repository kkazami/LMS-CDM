// Fault-injection process used by local integration tests; never a provider/stage adapter.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Controller } from '../../scripts/harness/controller';
import { execute } from '../../scripts/harness/runner';
import { OWNERS, Stage } from '../../scripts/harness/types';

async function main() {
  const [root, runId, action, checkpoint] = process.argv.slice(2), c = new Controller(root, runId);
  const marker = (name: string) => fs.writeFileSync(path.join(c.store.dir, name + '.checkpoint'), 'ready');
  if (action === 'run') {
    const run = c.read(), stage = run.next as Stage, actor = run.input.actors[OWNERS[stage]];
    const { token } = c.begin(stage, actor);
    await execute(c, stage, actor, token, async point => { if (point === checkpoint) { marker(point); await new Promise<void>(() => { setInterval(() => {}, 1000); }); } });
  } else if (action === 'claim') {
    const stage = c.read().next!; c.begin(stage, c.read().input.actors[OWNERS[stage]]); marker('claimed'); setInterval(() => {}, 1000);
  } else if (action === 'repair-crash' || action === 'approval-crash') {
    const append = c.store.append.bind(c.store);
    c.store.append = (event, at) => { if (event.type === (action === 'repair-crash' ? 'REPAIR' : 'APPROVE')) { marker('mutation'); process.exit(77); } return append(event, at); };
    if (action === 'repair-crash') c.repair();
    else c.approve(JSON.parse(process.env.HARNESS_TEST_APPROVAL!));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
