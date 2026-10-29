import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resourceSchema, templateDefinition, responseComplete } from '../../apps/web/src/lib/labs/schema';
import { youtubeLink } from '../../apps/web/src/lib/labs/resources';
import { MYSQL_LAB } from '../../apps/web/src/lib/labs/mysql';

test('YouTube sharing formats normalize to a watch link with a bounded start time', () => {
  for (const url of ['https://youtu.be/IyumH8CiUPQ?si=sharing', 'https://www.youtube.com/watch?v=IyumH8CiUPQ', 'https://m.youtube.com/shorts/IyumH8CiUPQ', 'https://www.youtube-nocookie.com/embed/IyumH8CiUPQ']) {
    assert.equal(youtubeLink(url), 'https://www.youtube.com/watch?v=IyumH8CiUPQ');
  }
  assert.equal(youtubeLink('https://youtu.be/IyumH8CiUPQ?t=1m30s'), 'https://www.youtube.com/watch?v=IyumH8CiUPQ&t=90');
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.invalid/watch?v=IyumH8CiUPQ', 'https://user:password@youtube.com/watch?v=IyumH8CiUPQ', 'http://youtu.be/IyumH8CiUPQ', 'https://youtube.com/redirect?v=IyumH8CiUPQ', 'https://youtube.com/watch?v=invalid']) assert.equal(youtubeLink(url), null);
});

test('resource input rejects HTML, remote image fetches, credentials, and private destinations', () => {
  for (const url of ['data:image/png;base64,abc', 'https://example.com/screenshot.png', '/api/assets/id?inline=1', '/images/labs/unknown.svg', '/api/assets/../secret']) {
    assert.equal(resourceSchema.safeParse({ type: 'IMAGE', title: 'Example', url }).success, false);
  }
  assert.equal(resourceSchema.safeParse({ type: 'IMAGE', title: 'Example', url: '/api/assets/owned-screenshot' }).success, true);
  for (const url of ['http://example.com', 'https://127.0.0.1/image', 'https://[::1]/image', 'https://service.local/guide', 'https://user:secret@example.com/guide']) {
    assert.equal(resourceSchema.safeParse({ type: 'LINK', title: 'Example', url }).success, false);
  }
  assert.equal(resourceSchema.safeParse({ type: 'YOUTUBE', title: 'Example', url: 'https://youtu.be/IyumH8CiUPQ', iframe: '<iframe />' }).success, false);
});

test('optional help survives template validation without changing step completion', () => {
  const help = { type: 'YOUTUBE' as const, title: 'Example', url: 'https://youtu.be/IyumH8CiUPQ' };
  const steps = MYSQL_LAB.steps.map((step, index) => index ? step : { ...step, config: { ...step.config, resources: [help] } });
  const parsed = templateDefinition.parse({ ...MYSQL_LAB, steps });
  assert.equal(parsed.steps[0].config.resources?.[0].url, 'https://www.youtube.com/watch?v=IyumH8CiUPQ');
  assert.equal(responseComplete(parsed.steps[0], { acknowledged: true }), true);
  assert.equal(responseComplete(parsed.steps[0], { acknowledged: false }), false);
  assert.equal(templateDefinition.safeParse({ ...MYSQL_LAB, steps: [{ ...steps[0], config: { ...steps[0].config, resources: Array(5).fill(help) } }] }).success, false);
  assert.equal(templateDefinition.safeParse({ ...MYSQL_LAB, steps: [{ ...steps[0], config: { body: 'Legacy instructions without optional media.' } }] }).success, true);
});
