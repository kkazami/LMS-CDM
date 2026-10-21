import fs from 'node:fs';
import { spawn } from 'node:child_process';
const files = [
  'tests/roster/rules.test.ts', 'tests/program-head/meeting-links.test.ts', 'tests/navigation/active-path.test.ts', 'tests/calendar/student-calendar.test.ts',
  'tests/codelab/completion.test.cjs', 'tests/codelab/runner.test.cjs', 'tests/security/mutation-origin.test.cjs', 'tests/auth/login-diagnostics.test.cjs',
  'tests/database/ssl-config.test.cjs', 'tests/calendar/events-api.test.cjs',
  'tests/web-quality/security.test.cjs', 'tests/web-quality/academic.test.cjs', 'tests/web-quality/sessions.test.cjs', 'tests/web-quality/resources.test.cjs',
  'tests/web-quality/load.test.mjs', 'tests/web-quality/dependencies.test.mjs',
];
fs.mkdirSync('tmp/web-quality', { recursive: true });
const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-reporter=junit', '--test-reporter-destination=tmp/web-quality/product-tests.xml', ...files], { stdio: 'inherit', windowsHide: true });
child.on('error', () => { console.error('Product test runner could not start.'); process.exitCode = 1; });
child.on('close', code => { console.log('Product test exit: ' + code + '; evidence: tmp/web-quality/product-tests.xml'); process.exitCode = code ?? 1; });
