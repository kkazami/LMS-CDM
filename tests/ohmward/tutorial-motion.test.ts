import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tourBubble, tourCallout } from '../../apps/web/src/features/interactive-activities/ohmward/components/tutorial-motion';

test('circular dimming starts beyond every viewport corner and leaves the entire control clear', () => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 375, height: 400 }, { width: 1440, height: 768 }]) {
    for (const target of [
      { left: 12, top: 80, width: 120, height: 54 },
      { left: viewport.width - 180, top: viewport.height - 80, width: 168, height: 48 },
      { left: -20, top: 100, width: 350, height: 46 },
    ]) {
      const bubble = tourBubble(target, viewport);
      assert.equal(bubble.x, target.left + target.width / 2);
      assert.equal(bubble.y, target.top + target.height / 2);
      for (const x of [0, viewport.width]) for (const y of [0, viewport.height]) {
        assert.ok(Math.hypot(x - bubble.x, y - bubble.y) < bubble.coverRadius);
      }
      for (const x of [target.left, target.left + target.width]) for (const y of [target.top, target.top + target.height]) {
        assert.ok(Math.hypot(x - bubble.x, y - bubble.y) < bubble.focusRadius);
      }
      assert.ok(bubble.coverRadius >= bubble.focusRadius);
    }
  }
});

test('the reported desktop case keeps its visible control in place and anchors instructions beside it', () => {
  const target = { left: 574, top: 91, width: 112, height: 60 };
  const result = tourCallout(target, { height: 312 }, { left: 292, top: 68, width: 1604, height: 831 });
  assert.equal(result.scrollBy, 0);
  assert.equal(result.side, 'right');
  assert.equal(result.left, 702);
  assert.equal(result.top, 68);
});

test('callouts fit beside or above/below targets without covering them, including short phones', () => {
  for (const area of [
    { left: 12, top: 68, width: 341, height: 520 },
    { left: 12, top: 60, width: 341, height: 264 },
    { left: 292, top: 68, width: 1062, height: 688 },
  ]) {
    for (const target of [
      { left: area.left + 40, top: area.top + 100, width: 120, height: 56 },
      { left: area.left + area.width - 150, top: area.top + area.height - 65, width: 140, height: 56 },
      { left: area.left, top: area.top + area.height + 250, width: 140, height: 56 },
    ]) for (const maxScrollUp of [0, 500]) {
      const result = tourCallout(target, { height: 340 }, area, maxScrollUp);
      const movedTop = target.top - result.scrollBy, movedBottom = movedTop + target.height;
      assert.ok(result.scrollBy >= -maxScrollUp);
      assert.ok(result.left >= area.left && result.left + result.width <= area.left + area.width);
      assert.ok(result.top >= area.top && result.top + result.maxHeight <= area.top + area.height);
      assert.ok(movedTop >= area.top && movedBottom <= area.top + area.height);
      assert.ok(result.left >= target.left + target.width || result.left + result.width <= target.left || result.top >= movedBottom || result.top + result.maxHeight <= movedTop);
    }
  }
});

test('phone walkthroughs center the focus bubble and instructions above the bottom bar', () => {
  const area = { left: 12, top: 68, width: 341, height: 520 };
  const target = { left: 100, top: 550, width: 120, height: 56 };
  const result = tourCallout(target, { height: 300 }, area, 500);
  const bubble = tourBubble({ ...target, top: target.top - result.scrollBy }, { width: 375, height: 667 });
  const groupTop = bubble.y - bubble.focusRadius;
  const groupBottom = result.top + result.maxHeight;
  assert.equal(result.side, 'below');
  assert.ok(Math.abs((groupTop + groupBottom) / 2 - (area.top + area.height / 2)) < 1);
  assert.ok(bubble.y + bubble.focusRadius + 16 <= result.top + 1);
  assert.ok(groupTop >= area.top && groupBottom <= area.top + area.height);
  assert.equal(result.left + result.width / 2, area.left + area.width / 2);
});

test('manual scrolling uses available space instead of pulling the student back to the target', () => {
  const area = { left: 12, top: 60, width: 341, height: 264 };
  const target = { left: 100, top: 160, width: 120, height: 56 };
  const result = tourCallout(target, { height: 340 }, area, 500, false);
  assert.equal(result.scrollBy, 0);
  assert.ok(result.top >= target.top + target.height || result.top + result.maxHeight <= target.top);
});

test('panning a canvas target offscreen cannot move the instructions or End control outside the viewport', () => {
  const area = { left: 12, top: 68, width: 341, height: 520 };
  for (const left of [-500, 900]) {
    const result = tourCallout({ left, top: 160, width: 60, height: 56 }, { height: 300 }, area, 500, false);
    assert.equal(result.scrollBy, 0);
    assert.ok(result.left >= area.left);
    assert.ok(result.left + result.width <= area.left + area.width);
    assert.ok(result.top >= area.top && result.top + result.maxHeight <= area.top + area.height);
  }
});
