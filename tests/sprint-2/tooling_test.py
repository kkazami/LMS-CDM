import importlib.util
import unittest

spec = importlib.util.spec_from_file_location('assess', 'scripts/security/assess.py')
assess = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assess)

class AssessmentTests(unittest.TestCase):
    def test_clean(self):
        self.assertTrue(assess.audit(self.clean())['passed'])

    def clean(self):
        return {'metadata': {'vulnerabilities': dict.fromkeys(assess.SEVERITIES, 0)}, 'advisories': {}}

    def test_errors_missing_and_muted(self):
        for value in [{}, {'error': {'message': 'dummy'}}, {**self.clean(), 'muted': ['dummy']},
                      {**self.clean(), 'advisories': None}, {**self.clean(), 'metadata': {'vulnerabilities': {'high': 0}}}]:
            with self.subTest(value=value), self.assertRaises((ValueError, KeyError, TypeError)):
                assess.audit(value)

    def test_high_is_not_success(self):
        data = self.clean()
        data['metadata']['vulnerabilities']['high'] = 1
        data['advisories']['dummy'] = {'severity': 'high', 'module_name': 'dummy', 'findings': [{'paths': ['.>dummy']}],
                                     'patched_versions': '>=2', 'url': 'https://example.invalid/dummy'}
        self.assertFalse(assess.audit(data)['passed'])

    def test_inconsistent_counts(self):
        data = self.clean()
        data['metadata']['vulnerabilities']['high'] = 1
        with self.assertRaises(ValueError): assess.audit(data)

    def test_aggregate_success(self):
        self.assertTrue(assess.aggregate(self.jobs())['passed'])

    def jobs(self):
        return {key: {'result': 'success'} for key in ['dependencies', 'static', 'secrets', 'compatibility']}

    def test_aggregate_missing_or_skipped(self):
        for value in [{}, {**self.jobs(), 'extra': {'result': 'success'}},
                      *[{**self.jobs(), 'static': {'result': status}} for status in ['failure', 'skipped', 'cancelled', None]]]:
            with self.subTest(value=value), self.assertRaises(ValueError): assess.aggregate(value)

if __name__ == '__main__': unittest.main()
