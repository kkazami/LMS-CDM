import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeIbeInstructorTopGrades,
  type RawCourseGradeInput,
} from "../top-grades";
import { defaultPeriodPolicy } from "../../grading/periods";

describe("IBE Instructor Top 10 Highest Grades (Midterm & Finals)", () => {
  it("computes and ranks Top 10 highest Midterm and Finals grades across courses", () => {
    const students = Array.from({ length: 12 }, (_, idx) => ({
      id: `stu-${idx + 1}`,
      name: `Student ${String(idx + 1).padStart(2, "0")}`,
      studentNumber: `2026-00${String(idx + 1).padStart(2, "0")}`,
    }));

    const scoresByStudent: Record<string, Record<string, number>> = {};
    students.forEach((s, idx) => {
      // Midterm scores from 78 to 99; Finals scores in reverse order
      scoresByStudent[s.id] = {
        "mid-item-1": 78 + idx * 1.8,
        "fin-item-1": 99 - idx * 1.5,
      };
    });

    const courseInput: RawCourseGradeInput = {
      courseId: "course-ibe-101",
      courseCode: "BA-HRM101",
      courseTitle: "Human Resource Management Principles",
      section: "1A",
      students,
      items: [
        {
          id: "mid-item-1",
          type: "MIDTERM_EXAM",
          maxPoints: 100,
          gradingPeriod: "MIDTERM",
        },
        {
          id: "fin-item-1",
          type: "FINAL_EXAM",
          maxPoints: 100,
          gradingPeriod: "FINALS",
        },
      ],
      scoresByStudent,
      periodPolicy: defaultPeriodPolicy,
      legacyWeights: [],
    };

    const result = computeIbeInstructorTopGrades([courseInput]);

    // Caps strictly at Top 10
    assert.equal(result.overallMidtermTop10.length, 10);
    assert.equal(result.overallFinalsTop10.length, 10);

    // Midterm #1 should be stu-12 (highest Midterm score: 97.80% -> 1.00)
    assert.equal(result.overallMidtermTop10[0]?.rank, 1);
    assert.equal(result.overallMidtermTop10[0]?.studentId, "stu-12");
    assert.equal(result.overallMidtermTop10[0]?.percentage, 97.8);
    assert.equal(result.overallMidtermTop10[0]?.gradePoint, "1.00");

    // Finals #1 should be stu-1 (highest Finals score: 99.00% -> 1.00)
    assert.equal(result.overallFinalsTop10[0]?.rank, 1);
    assert.equal(result.overallFinalsTop10[0]?.studentId, "stu-1");
    assert.equal(result.overallFinalsTop10[0]?.percentage, 99);
    assert.equal(result.overallFinalsTop10[0]?.gradePoint, "1.00");

    // Verify descending order for all 10 entries
    for (let i = 1; i < 10; i++) {
      assert.ok(
        result.overallMidtermTop10[i - 1]!.percentage >=
          result.overallMidtermTop10[i]!.percentage
      );
      assert.ok(
        result.overallFinalsTop10[i - 1]!.percentage >=
          result.overallFinalsTop10[i]!.percentage
      );
    }
  });
});

