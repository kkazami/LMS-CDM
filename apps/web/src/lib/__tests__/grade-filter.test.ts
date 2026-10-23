import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterGradeData } from '../../app/(dashboard)/[institute]/grades/data/grade-filter';
import type { GradeRow, EnrolledCourse } from '../../app/(dashboard)/[institute]/grades/types';

describe('Grades Subject Filter and Stats Helper (filterGradeData)', () => {
  const enrolledCourses: EnrolledCourse[] = [
    { id: 'course-1', title: 'Data Structures and Algorithms', code: 'CS101' },
    { id: 'course-2', title: 'Web Development', code: 'CS102' },
    { id: 'course-3', title: 'Discrete Mathematics', code: 'MATH101' },
  ];

  const gradeRows: GradeRow[] = [
    {
      id: 'sub-1',
      syllabusItemId: 'item-1',
      itemTitle: 'Quiz 1: Arrays',
      itemType: 'QUIZ',
      courseId: 'course-1',
      courseTitle: 'Data Structures and Algorithms',
      courseCode: 'CS101',
      grade: 95,
      maxPoints: 100, // 95%
      gradedAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'sub-2',
      syllabusItemId: 'item-2',
      itemTitle: 'Assignment 1: Linked Lists',
      itemType: 'ASSIGNMENT',
      courseId: 'course-1',
      courseTitle: 'Data Structures and Algorithms',
      courseCode: 'CS101',
      grade: 97,
      maxPoints: 100, // 97% -> course-1 avg: 96% -> 1.00 Passed
      gradedAt: '2026-09-15T10:00:00.000Z',
    },
    {
      id: 'sub-3',
      syllabusItemId: 'item-3',
      itemTitle: 'Project 1: Portfolio',
      itemType: 'ASSIGNMENT',
      courseId: 'course-2',
      courseTitle: 'Web Development',
      courseCode: 'CS102',
      grade: 80,
      maxPoints: 100, // 80% -> 2.75 Passed
      gradedAt: '2026-09-20T10:00:00.000Z',
    },
  ];

  describe('Scenario 1: All Subjects ("all")', () => {
    it('aggregates all rows, computes multi-course GWA, and provides per-course breakdown', () => {
      const result = filterGradeData(gradeRows, enrolledCourses, 'all');

      assert.equal(result.isEnrolled, true);
      assert.equal(result.hasGradedWork, true);
      assert.equal(result.isAllSubjects, true);
      assert.equal(result.isUnknownCourse, false);
      assert.equal(result.selectedCourse, null);
      assert.equal(result.filteredRows.length, 3);
      assert.equal(result.allRows.length, 3);

      // Per-course stats includes course-1 and course-2 (course-3 has no grades)
      assert.equal(result.perCourseStats.length, 2);

      const cs101 = result.perCourseStats.find((s) => s.courseId === 'course-1');
      assert.ok(cs101);
      assert.equal(cs101.courseCode, 'CS101');
      assert.equal(cs101.avgPercent, 96);
      assert.equal(cs101.gradePoint, 1.00);
      assert.equal(cs101.remark, 'Passed');
      assert.equal(cs101.itemCount, 2);

      const cs102 = result.perCourseStats.find((s) => s.courseId === 'course-2');
      assert.ok(cs102);
      assert.equal(cs102.courseCode, 'CS102');
      assert.equal(cs102.avgPercent, 80);
      assert.equal(cs102.gradePoint, 2.75);
      assert.equal(cs102.remark, 'Passed');
      assert.equal(cs102.itemCount, 1);

      // GWA across course-1 (1.00) and course-2 (2.75): (1.00 + 2.75) / 2 = 1.875
      assert.equal(result.gwa, 1.875);
      assert.equal(result.gwaRemark, 'Passed');
      assert.equal(result.isGwaPassing, true);

      // Trend data has 3 points
      assert.equal(result.trendData.length, 3);
    });

    it('handles student with no enrollments gracefully', () => {
      const result = filterGradeData([], [], 'all');
      assert.equal(result.isEnrolled, false);
      assert.equal(result.hasGradedWork, false);
      assert.equal(result.filteredRows.length, 0);
      assert.equal(result.gwa, null);
      assert.equal(result.gwaRemark, '');
    });
  });

  describe('Scenario 2: One Subject (Specific Enrolled Course)', () => {
    it('filters strictly to the selected subject and sets GWA to that subject grade point', () => {
      const result = filterGradeData(gradeRows, enrolledCourses, 'course-1');

      assert.equal(result.isEnrolled, true);
      assert.equal(result.hasGradedWork, true);
      assert.equal(result.isAllSubjects, false);
      assert.equal(result.isUnknownCourse, false);
      assert.ok(result.selectedCourse);
      assert.equal(result.selectedCourse.id, 'course-1');
      assert.equal(result.selectedCourse.code, 'CS101');

      // Only course-1 rows (2 items)
      assert.equal(result.filteredRows.length, 2);
      assert.ok(result.filteredRows.every((r) => r.courseId === 'course-1'));

      // GWA equals the subject grade point (1.00)
      assert.equal(result.gwa, 1.00);
      assert.equal(result.gwaRemark, 'Passed');
      assert.equal(result.isGwaPassing, true);
      assert.equal(result.overallPercent, 96);

      // Per course stats has only 1 entry for this course
      assert.equal(result.perCourseStats.length, 1);
      assert.equal(result.perCourseStats[0].courseId, 'course-1');
      assert.equal(result.perCourseStats[0].avgPercent, 96);
      assert.equal(result.perCourseStats[0].gradePoint, 1.00);

      // Trend data has only 2 points for course-1
      assert.equal(result.trendData.length, 2);
      assert.ok(result.trendData.every((t) => t.courseCode === 'CS101'));
    });

    it('correctly calculates failing grade point and remark for a failing subject', () => {
      const failingRows: GradeRow[] = [
        {
          id: 'sub-f1',
          syllabusItemId: 'item-f1',
          itemTitle: 'Exam 1',
          itemType: 'ASSIGNMENT',
          courseId: 'course-1',
          courseTitle: 'Data Structures and Algorithms',
          courseCode: 'CS101',
          grade: 60,
          maxPoints: 100, // 60% -> 5.00 Failing
          gradedAt: '2026-09-10T10:00:00.000Z',
        },
      ];

      const result = filterGradeData(failingRows, enrolledCourses, 'course-1');
      assert.equal(result.hasGradedWork, true);
      assert.equal(result.gwa, 5.00);
      assert.equal(result.gwaRemark, 'Failed');
      assert.equal(result.isGwaPassing, false);
      assert.equal(result.overallPercent, 60);
    });
  });

  describe('Scenario 3: Unknown Subject ID', () => {
    it('flags isUnknownCourse, returns empty lists, and null GWA', () => {
      const result = filterGradeData(gradeRows, enrolledCourses, 'non-existent-course-id');

      assert.equal(result.isEnrolled, true);
      assert.equal(result.hasGradedWork, false);
      assert.equal(result.isAllSubjects, false);
      assert.equal(result.isUnknownCourse, true);
      assert.equal(result.selectedCourse, null);
      assert.equal(result.filteredRows.length, 0);
      assert.equal(result.perCourseStats.length, 0);
      assert.equal(result.trendData.length, 0);
      assert.equal(result.gwa, null);
      assert.equal(result.gwaRemark, '');
      assert.equal(result.isGwaPassing, false);
      assert.equal(result.overallPercent, 0);
    });
  });

  describe('Scenario 4: Enrolled Subject with No Grades', () => {
    it('identifies valid course with zero graded submissions as clear empty state', () => {
      // course-3 is in enrolledCourses, but has 0 items in gradeRows
      const result = filterGradeData(gradeRows, enrolledCourses, 'course-3');

      assert.equal(result.isEnrolled, true);
      assert.equal(result.hasGradedWork, false);
      assert.equal(result.isAllSubjects, false);
      assert.equal(result.isUnknownCourse, false);
      assert.ok(result.selectedCourse);
      assert.equal(result.selectedCourse.id, 'course-3');
      assert.equal(result.selectedCourse.code, 'MATH101');

      assert.equal(result.filteredRows.length, 0);
      assert.equal(result.perCourseStats.length, 0);
      assert.equal(result.trendData.length, 0);
      assert.equal(result.gwa, null);
      assert.equal(result.gwaRemark, '');
      assert.equal(result.isGwaPassing, false);
      assert.equal(result.overallPercent, 0);
    });
  });
});
