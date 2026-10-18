import assert from 'node:assert/strict';
import test from 'node:test';
import { googleMeetLinks } from '../../apps/web/src/lib/academic-structure/meeting-links';

test('extracts Google Meet links while preserving announcement text', () => {
    const content = 'Join at 8:30 AM: https://meet.google.com/jpy-mhvi-xjf.';
    assert.deepEqual(googleMeetLinks(content), ['https://meet.google.com/jpy-mhvi-xjf']);
    assert.equal(content, 'Join at 8:30 AM: https://meet.google.com/jpy-mhvi-xjf.');
});

test('deduplicates meetings and supports lookup links and multiple meetings', () => {
    assert.deepEqual(googleMeetLinks('https://meet.google.com/abc-defg-hij https://meet.google.com/abc-defg-hij (https://meet.google.com/lookup/class_1)'), [
        'https://meet.google.com/abc-defg-hij', 'https://meet.google.com/lookup/class_1',
    ]);
});

test('rejects lookalike hosts, credentials, invalid meeting paths and non-HTTPS links', () => {
    for (const link of ['http://meet.google.com/abc-defg-hij', 'https://meet.google.com.example.org/abc-defg-hij', 'https://meet.google.com@evil.example/abc-defg-hij', 'https://user:secret@meet.google.com/abc-defg-hij', 'https://meet.google.com:8080/abc-defg-hij', 'https://meet.google.com/not-a-meeting', 'javascript:alert(1)']) {
        assert.deepEqual(googleMeetLinks(link), [], link);
    }
});

test('plain announcements do not produce meeting buttons', () => {
    assert.deepEqual(googleMeetLinks('Please submit your activity tomorrow.'), []);
});
