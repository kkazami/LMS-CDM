-- Migration: 20261103000000_remove_quiz_arena
-- DESTRUCTIVE: Quiz Arena feature removed. Drops all six Arena tables and their data
-- (quizzes, questions, choices, game sessions, participants, player answers).
-- Explicitly approved by the project owner on 2026-11-03.
-- Back up these tables first if the data may be needed. Apply only AFTER the
-- code without Arena is deployed, so no running build queries these tables.
-- Only Arena tables are dropped; CASCADE removes their own FKs/indexes. No
-- non-Arena table references Arena tables, so no other data is affected.

DROP TABLE IF EXISTS "ArenaPlayerAnswer" CASCADE;
DROP TABLE IF EXISTS "ArenaParticipant" CASCADE;
DROP TABLE IF EXISTS "ArenaGameSession" CASCADE;
DROP TABLE IF EXISTS "ArenaAnswerChoice" CASCADE;
DROP TABLE IF EXISTS "ArenaQuestion" CASCADE;
DROP TABLE IF EXISTS "ArenaQuiz" CASCADE;

