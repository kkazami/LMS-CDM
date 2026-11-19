"""Runs only inside the offline scanner container. Emit summaries, never secret matches."""
import json, subprocess, sys
from pathlib import Path

mode = sys.argv[1]
if mode == 'static':
    checks = subprocess.run(['python3', 'tests/sprint-2/tooling_test.py'], capture_output=True, timeout=30)
    if checks.returncode or b'Ran 6 tests' not in checks.stderr: raise SystemExit('Assessment self-tests failed or missing')
    fixture = subprocess.run(['semgrep','scan','--config','scripts/security/semgrep.yml','--json','--quiet',
        '--no-rewrite-rule-ids','--no-git-ignore','--strict','--metrics','off','--disable-version-check',
        'tests/sprint-2/semgrep/client.ts'],capture_output=True,timeout=45)
    fixture_data = json.loads(fixture.stdout)
    expected = {(line.split('ruleid: ',1)[1], number+2) for number,line in
        enumerate(Path('tests/sprint-2/semgrep/client.ts').read_text().splitlines()) if '// ruleid: ' in line}
    observed = {(item['check_id'], item['start']['line']) for item in fixture_data['results']}
    if fixture.returncode or fixture_data.get('errors') or observed != expected:
        raise SystemExit('Static rule positive/negative fixtures failed: '+str({'expected':sorted(expected),'observed':sorted(observed)}))
    result = subprocess.run(['semgrep', 'scan', '--config', 'scripts/security/semgrep.yml', '--metrics', 'off',
        '--disable-version-check', '--error', '--strict', '--quiet', '--json', '--no-git-ignore',
        'apps/desktop/electron', 'apps/desktop/renderer/offline.js', 'apps/mobile/src/lib/api-url.ts',
        'apps/mobile/src/lib/google-login-validation.ts', 'apps/mobile/src/lib/student-navigation.ts'],
        capture_output=True, timeout=150)
    data = json.loads(result.stdout)
    expected_paths = set(json.loads(Path('scripts/security/scan-scope.json').read_text())['files'])
    if data.get('errors') or set(data.get('paths', {}).get('scanned', [])) != expected_paths:
        raise SystemExit('Static scanner error, missing files or unexpected scope')
    print(json.dumps({'scanner': 'semgrep', 'assessment_self_tests': 6, 'static_rule_fixtures': 'passed', 'scanned': data['paths']['scanned'],
        'findings': [{'rule': item['check_id'], 'path': item['path'], 'line': item['start']['line']} for item in data['results']],
        'exit': result.returncode}))
    sys.exit(result.returncode)
elif mode == 'secrets':
    result = subprocess.run(['/scratch/gitleaks', 'dir', '/source', '--no-banner', '--redact=100',
        '--report-format=json', '--report-path=/scratch/gitleaks.json', '--exit-code=1', '--max-target-megabytes=2'],
        capture_output=True, timeout=120)
    report = Path('/scratch/gitleaks.json')
    if result.returncode not in (0, 1) or not report.is_file(): raise SystemExit('Secret scanner failed')
    data = json.loads(report.read_text())
    if not isinstance(data, list) or bool(data) != (result.returncode == 1): raise SystemExit('Invalid secret scanner report')
    print(json.dumps({'scanner': 'gitleaks', 'scope': 'explicit scan-scope.json files only, no Git history',
        'findings': [{'rule': item['RuleID'], 'path': item['File'], 'line': item['StartLine']} for item in data],
        'exit': result.returncode}))
    sys.exit(result.returncode)
else: raise ValueError('Unknown scanner mode')
