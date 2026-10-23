import {execFileSync} from 'node:child_process';

const files = execFileSync('git', ['-c', 'core.fsmonitor=false', 'ls-files', '-z'], {
  encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
}).split('\0').filter(Boolean);
const localOnly = file =>
  /^(?:\.agent|\.codex|\.impeccable|\.idea|\.vscode|\.pnpm-store|tmp|output|plans|scratch|storage|playwright)\//.test(file) ||
  /^\.agents\/(?!agents\/|rules\/)/.test(file) ||
  /^\.orchestra\/(?!harness\/)/.test(file) ||
  /(?:^|\/)(?:node_modules|\.next|\.expo|\.turbo|\.vercel|\.wrangler)\//.test(file) ||
  /(?:^|\/)\.env[^/]*$/.test(file) && !file.endsWith('/.env.example') && file !== '.env.example' ||
  /(?:^|\/)\.dev\.vars[^/]*$|\.(?:pem|key|p12|pfx|tsbuildinfo|log)$/.test(file) ||
  /^(?:PRODUCT\.md|DESIGN\.md|DEVELOPMENT_HISTORY\.md|EXPO_MOBILE_APP_SPEC_FOR_GPT_ASTRA\.md|UI_UX_AUDIT_REPORT\.md|mcp_config\.json|skills-lock\.json|changed-files\.json|scratch-ssr\.html)$/.test(file) ||
  /^apps\/web\/public\/uploads\//.test(file);
const rejected = files.filter(localOnly);
if (rejected.length) {
  console.error(`Local-only files are tracked (${rejected.length}):\n${rejected.slice(0,30).join('\n')}`);
  process.exitCode = 1;
} else console.log(`Repository file check passed: ${files.length} tracked files; no local-only artifacts.`);
