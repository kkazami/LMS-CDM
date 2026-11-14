-- REVIEW CANDIDATE ONLY. Not in prisma/migrations, and not executed.
-- After approval, dependency/backup verification and historical checksum repair,
-- use this to replace the still-unapplied removal migration before its FIRST run.
-- Recheck live row counts. This removes all data in exactly these six tables.
-- Default RESTRICT intentionally refuses unreviewed dependent objects.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP TABLE
  public."ArenaPlayerAnswer",
  public."ArenaParticipant",
  public."ArenaGameSession",
  public."ArenaAnswerChoice",
  public."ArenaQuestion",
  public."ArenaQuiz";

COMMIT;
