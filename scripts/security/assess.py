"""Fail-closed public advisory and CI-result assessment; never consumes database records."""
import json, sys
from pathlib import Path

SEVERITIES = ('info', 'low', 'moderate', 'high', 'critical')

def audit(data):
    if not isinstance(data, dict) or data.get('error') or data.get('muted'):
        raise ValueError('Scanner error or muted advisories')
    counts = data['metadata']['vulnerabilities']
    if any(type(counts.get(s)) is not int or counts[s] < 0 for s in SEVERITIES):
        raise ValueError('Missing or invalid severity counts')
    records = data['advisories']
    if not isinstance(records, dict):
        raise ValueError('Missing advisory inventory')
    matches = []
    for key, item in records.items():
        severity = item['severity']
        if severity not in SEVERITIES or counts[severity] == 0:
            raise ValueError('Inconsistent advisory severity')
        paths = [p for finding in item['findings'] for p in finding['paths']]
        if not paths or not all(isinstance(p, str) and p for p in paths):
            raise ValueError('Missing affected dependency paths')
        matches.append({'id': str(key), 'package': item['module_name'], 'severity': severity,
            'paths': paths, 'patched': item['patched_versions'], 'url': item['url']})
    if bool(sum(counts.values())) != bool(matches):
        raise ValueError('Missing advisory records or counts')
    return {'counts': counts, 'advisories': matches, 'passed': counts['critical'] == counts['high'] == 0}

def aggregate(data):
    expected = {'dependencies', 'static', 'secrets', 'compatibility'}
    if set(data) != expected or any(data[k].get('result') != 'success' for k in expected):
        raise ValueError('Missing, failed, skipped, cancelled or unexpected required job')
    return {'passed': True, 'jobs': sorted(expected)}

def main():
    mode, source, output = sys.argv[1:]
    data = json.loads(Path(source).read_text(encoding='utf8'))
    result = audit(data) if mode == 'audit' else aggregate(data) if mode == 'aggregate' else None
    if result is None: raise ValueError('Unknown assessment')
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(json.dumps(result, indent=2)+'\n', encoding='utf8')
    print(json.dumps({'mode': mode, 'passed': result['passed'], 'counts': result.get('counts')}))
    return 0 if result['passed'] else 1

if __name__ == '__main__':
    try: sys.exit(main())
    except (ValueError, KeyError, TypeError, OSError) as error:
        print('Security assessment failed: ' + str(error), file=sys.stderr)
        sys.exit(2)
