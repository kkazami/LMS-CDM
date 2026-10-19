// Node's test runner owns pass/fail. This reporter preserves individual test names.
const fs = require('node:fs');
module.exports = async function* (events) {
  const tests = [];
  for await (const event of events) {
    if ((event.type === 'test:pass' || event.type === 'test:fail') && event.data.details?.type !== 'suite') {
      const d = event.data;
      const failure = d.details?.error ? { message: d.details.error.message, stack: d.details.error.stack } : undefined;
      tests.push({ id: d.name, status: event.type === 'test:pass' && !d.skip && !d.todo ? 'passed' : 'failed', executed: !d.skip && !d.todo, ...(failure ? { failure } : {}) });
      yield `${event.type === 'test:pass' ? 'PASS' : 'FAIL'} ${d.name}\n`;
      if (failure) yield JSON.stringify(failure) + '\n';
    }
  }
  if (process.env.HARNESS_RESULT_PATH) fs.writeFileSync(process.env.HARNESS_RESULT_PATH, JSON.stringify({ environment: process.env.HARNESS_ENVIRONMENT_ID, tests }));
  yield `Executed ${tests.length} tests\n`;
};
