CREATE TABLE "CourseGradebookPolicy" (
  "courseId" TEXT NOT NULL,
  "midtermWeightPercentage" DOUBLE PRECISION NOT NULL DEFAULT 40,
  "finalsWeightPercentage" DOUBLE PRECISION NOT NULL DEFAULT 60,
  "categoryWeights" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseGradebookPolicy_pkey" PRIMARY KEY ("courseId"),
  CONSTRAINT "CourseGradebookPolicy_weights_check" CHECK (
    "midtermWeightPercentage" BETWEEN 0 AND 100 AND "finalsWeightPercentage" BETWEEN 0 AND 100
    AND abs("midtermWeightPercentage" + "finalsWeightPercentage" - 100) < 0.000001
  ),
  CONSTRAINT "CourseGradebookPolicy_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ClassworkGradingPeriod" (
  "syllabusItemId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassworkGradingPeriod_pkey" PRIMARY KEY ("syllabusItemId"),
  CONSTRAINT "ClassworkGradingPeriod_period_check" CHECK ("period" IN ('MIDTERM', 'FINALS', 'UNASSIGNED')),
  CONSTRAINT "ClassworkGradingPeriod_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
