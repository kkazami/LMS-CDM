-- Additive only: preserve existing wide covers and inherit them until a mobile image is chosen.
-- Do not run the full pending migration chain without reviewing the separate Arena removal.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public."Course" ADD COLUMN "mobileCoverImage" TEXT;
COMMIT;
