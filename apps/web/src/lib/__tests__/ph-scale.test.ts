import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHILIPPINE_GRADING_SCALE,
  PASSING_GRADE_POINT_THRESHOLD,
  HIGHEST_GRADE_POINT,
  LOWEST_PASSING_GRADE_POINT,
  PASSING_MIN_PERCENT,
  percentToGradePoint,
  isPassing,
  formatGradePoint,
  getGradeRemark,
  computeGwa,
} from '../grading/ph-scale';

describe('Philippine Collegiate Grading Scale Module (ph-scale)', () => {
  describe('percentToGradePoint - boundary tests', () => {
    it('100% maps to 1.00', () => {
      assert.equal(percentToGradePoint(100), 1.00);
    });

    it('99% maps to 1.00', () => {
      assert.equal(percentToGradePoint(99), 1.00);
    });

    it('96% maps to 1.00 (inclusive lower bound of highest band)', () => {
      assert.equal(percentToGradePoint(96), 1.00);
    });

    it('95.99% maps to 1.25', () => {
      assert.equal(percentToGradePoint(95.99), 1.25);
    });

    it('94% maps to 1.25', () => {
      assert.equal(percentToGradePoint(94), 1.25);
    });

    it('92% maps to 1.50', () => {
      assert.equal(percentToGradePoint(92), 1.50);
    });

    it('89% maps to 1.75', () => {
      assert.equal(percentToGradePoint(89), 1.75);
    });

    it('88.99% maps to 2.00', () => {
      assert.equal(percentToGradePoint(88.99), 2.00);
    });

    it('87% maps to 2.00', () => {
      assert.equal(percentToGradePoint(87), 2.00);
    });

    it('84% maps to 2.25', () => {
      assert.equal(percentToGradePoint(84), 2.25);
    });

    it('82% maps to 2.50', () => {
      assert.equal(percentToGradePoint(82), 2.50);
    });

    it('79% maps to 2.75', () => {
      assert.equal(percentToGradePoint(79), 2.75);
    });

    it('75% maps to 3.00 (passing threshold)', () => {
      assert.equal(percentToGradePoint(75), 3.00);
    });

    it('74.99% maps to 5.00 (failing)', () => {
      assert.equal(percentToGradePoint(74.99), 5.00);
    });

    it('0% maps to 5.00', () => {
      assert.equal(percentToGradePoint(0), 5.00);
    });

    it('clamps values above 100 to 1.00', () => {
      assert.equal(percentToGradePoint(110), 1.00);
    });

    it('clamps negative values to 5.00', () => {
      assert.equal(percentToGradePoint(-10), 5.00);
    });

    it('returns null for null, undefined, and NaN', () => {
      assert.equal(percentToGradePoint(null), null);
      assert.equal(percentToGradePoint(undefined), null);
      assert.equal(percentToGradePoint(NaN), null);
    });
  });

  describe('isPassing & getGradeRemark', () => {
    it('1.00 through 3.00 are passing', () => {
      const passingPoints = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
      for (const gp of passingPoints) {
        assert.equal(isPassing(gp), true, `${gp} should pass`);
        assert.equal(getGradeRemark(gp), 'Passed', `${gp} remark should be Passed`);
      }
    });

    it('5.00 is failing', () => {
      assert.equal(isPassing(5.00), false);
      assert.equal(getGradeRemark(5.00), 'Failed');
    });

    it('handles null and NaN safely in passing checks', () => {
      assert.equal(isPassing(null), false);
      assert.equal(isPassing(undefined), false);
      assert.equal(isPassing(NaN), false);
      assert.equal(getGradeRemark(null), '');
      assert.equal(getGradeRemark(undefined), '');
      assert.equal(getGradeRemark(NaN), '');
    });
  });

  describe('formatGradePoint', () => {
    it('formats grade points to 2 decimal places', () => {
      assert.equal(formatGradePoint(1), '1.00');
      assert.equal(formatGradePoint(1.75), '1.75');
      assert.equal(formatGradePoint(3), '3.00');
      assert.equal(formatGradePoint(5), '5.00');
    });

    it('formats null, undefined, and NaN as dash', () => {
      assert.equal(formatGradePoint(null), '—');
      assert.equal(formatGradePoint(undefined), '—');
      assert.equal(formatGradePoint(NaN), '—');
    });
  });

  describe('computeGwa', () => {
    it('computes GWA with no courses (empty array)', () => {
      assert.equal(computeGwa([]), null);
    });

    it('computes GWA with one course (number)', () => {
      assert.equal(computeGwa([1.75]), 1.75);
    });

    it('computes GWA with several courses equally weighted', () => {
      // (1.00 + 2.00) / 2 = 1.50
      assert.equal(computeGwa([1.00, 2.00]), 1.50);
      // (1.25 + 1.50 + 1.75) / 3 = 1.50
      assert.equal(computeGwa([1.25, 1.50, 1.75]), 1.50);
    });

    it('computes GWA with course objects (unweighted when units omitted)', () => {
      const courses = [
        { gradePoint: 1.00 },
        { gradePoint: 2.00 },
      ];
      assert.equal(computeGwa(courses), 1.50);
    });

    it('computes GWA weighted by units when units exist', () => {
      // Course A: 1.00, 3 units -> 3.0
      // Course B: 2.00, 1 unit  -> 2.0
      // Total: 5.0 / 4 units = 1.25
      const courses = [
        { gradePoint: 1.00, units: 3 },
        { gradePoint: 2.00, units: 1 },
      ];
      assert.equal(computeGwa(courses), 1.25);
    });

    it('handles nulls safely within the course collection', () => {
      const courses = [
        { gradePoint: 1.50 },
        { gradePoint: null },
      ];
      assert.equal(computeGwa(courses), 1.50);
    });
  });

  describe('Derived scale constants', () => {
    it('derives HIGHEST_GRADE_POINT as 1.00 from the scale', () => {
      assert.equal(HIGHEST_GRADE_POINT, 1.00);
      assert.equal(HIGHEST_GRADE_POINT, Math.min(...PHILIPPINE_GRADING_SCALE.map((b) => b.gradePoint)));
    });

    it('derives LOWEST_PASSING_GRADE_POINT as 3.00 from the scale and threshold', () => {
      assert.equal(LOWEST_PASSING_GRADE_POINT, 3.00);
      assert.equal(LOWEST_PASSING_GRADE_POINT, PASSING_GRADE_POINT_THRESHOLD);
      assert.equal(isPassing(LOWEST_PASSING_GRADE_POINT), true);
    });

    it('derives PASSING_MIN_PERCENT as 75 from the scale and threshold', () => {
      assert.equal(PASSING_MIN_PERCENT, 75);
      // 75% maps to passing grade point
      const gpAtPassingMin = percentToGradePoint(PASSING_MIN_PERCENT);
      assert.equal(gpAtPassingMin, 3.00);
      assert.equal(isPassing(gpAtPassingMin), true);

      // Just below 75% fails
      const gpBelowPassingMin = percentToGradePoint(PASSING_MIN_PERCENT - 0.01);
      assert.equal(gpBelowPassingMin, 5.00);
      assert.equal(isPassing(gpBelowPassingMin), false);
    });
  });
});

