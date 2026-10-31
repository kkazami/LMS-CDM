-- Existing coursework keeps its current submission behavior.
ALTER TABLE "SyllabusItem"
  ADD COLUMN "isProgramming" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requireGithubRepo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SyllabusItem"
  ADD CONSTRAINT "SyllabusItem_programming_submission_check"
  CHECK ((NOT "requireGithubRepo" OR "isProgramming")
    AND (upper("type") <> 'MATERIAL' OR (NOT "isProgramming" AND NOT "requireGithubRepo")));
