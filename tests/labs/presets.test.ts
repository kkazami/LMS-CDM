import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAB_PRESET_OPTIONS, LAB_PRESET_KEYS } from '../../apps/web/src/lib/labs/preset-catalog';
import { LAB_PRESETS } from '../../apps/web/src/lib/labs/presets';
import { templateDefinition } from '../../apps/web/src/lib/labs/schema';

test('every ICS starter opens as a valid draft with assessable evidence', () => {
  assert.deepEqual(new Set(LAB_PRESET_KEYS), new Set(Object.keys(LAB_PRESETS)));
  assert.deepEqual(new Set(LAB_PRESET_KEYS), new Set(LAB_PRESET_OPTIONS.map(option => option.key)));
  assert.equal(new Set(LAB_PRESET_OPTIONS.map(option => option.key)).size, LAB_PRESET_OPTIONS.length);
  for (const option of LAB_PRESET_OPTIONS) {
    const definition = templateDefinition.parse(LAB_PRESETS[option.key]);
    assert.equal(definition.title, option.title);
    assert.equal(definition.estimatedMinutes, option.minutes);
    assert.ok(definition.steps.some(step => step.type === 'TEXT_RESPONSE' && step.required), option.key);
    assert.ok(definition.steps.some(step => step.type === 'EVIDENCE_UPLOAD' && step.required && step.config.minFiles > 0), option.key);
    assert.ok(definition.steps.some(step => step.type === 'CHECKLIST' && step.required), option.key);
    assert.ok(definition.steps.every(step => step.required), option.key);
  }
});

test('hardware starters require supervised, non-live equipment', () => {
  const fiber = LAB_PRESETS.FIBER;
  const copper = LAB_PRESETS.RJ45;
  assert.match(fiber.prerequisites, /supervision/i);
  assert.match(fiber.prerequisites, /non-live/i);
  assert.match(JSON.stringify(fiber.steps), /Never look directly/i);
  assert.match(copper.prerequisites, /supervised/i);
  assert.match(JSON.stringify(copper.steps), /T568B/);
});
