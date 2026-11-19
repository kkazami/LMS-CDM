"""Compare complete public advisory inventories at PR base/head, without executing base code."""
import importlib.util, json, sys
from pathlib import Path
spec = importlib.util.spec_from_file_location('assess', Path(__file__).with_name('assess.py'))
assess = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assess)
head, base, output = sys.argv[1:]
current = assess.audit(json.loads(Path(head).read_text(encoding='utf8')))
previous = assess.audit(json.loads(Path(base).read_text(encoding='utf8'))) if base != '-' else None
def entries(report):
    return {(item['id'], path): item for item in report['advisories'] for path in item['paths']}
added = entries(current).keys() - entries(previous).keys() if previous else set()
result = {'mode': 'pull-request-base-comparison' if previous else 'non-PR-inventory-only',
    'new_advisory_paths': [{'id': key[0], 'path': key[1], 'severity': entries(current)[key]['severity']} for key in sorted(added)],
    'passed': not any(entries(current)[key]['severity'] in ['critical', 'high'] for key in added)}
Path(output).write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result))
sys.exit(0 if result['passed'] else 1)
