BEGIN;
-- Stop before changing data when reconciliation is required.
DO $preflight$
BEGIN
 IF to_regclass('public."ProgramMembership"') IS NULL THEN RAISE EXCEPTION 'CURRENT_ACADEMIC_BASELINE_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM "User" GROUP BY lower(btrim(email)) HAVING count(*)>1) THEN RAISE EXCEPTION 'ROSTER_RECONCILIATION_REQUIRED: duplicate emails'; END IF;
 IF EXISTS(SELECT 1 FROM "User" WHERE upper(role)='STUDENT' AND nullif(btrim("studentNumber"),'') IS NOT NULL AND nullif(btrim("uniqueId"),'') IS NOT NULL AND upper(btrim("studentNumber"))<>upper(btrim("uniqueId"))) THEN RAISE EXCEPTION 'ROSTER_RECONCILIATION_REQUIRED: conflicting student identifiers'; END IF;
 IF EXISTS(SELECT 1 FROM "User" WHERE coalesce(nullif(btrim("studentNumber"),''),CASE WHEN upper(role)='STUDENT' THEN nullif(btrim("uniqueId"),'') END) IS NOT NULL GROUP BY upper(coalesce(nullif(btrim("studentNumber"),''),CASE WHEN upper(role)='STUDENT' THEN nullif(btrim("uniqueId"),'') END)) HAVING count(*)>1) THEN RAISE EXCEPTION 'ROSTER_RECONCILIATION_REQUIRED: duplicate student numbers'; END IF;
 IF EXISTS(SELECT 1 FROM "ProgramMembership" WHERE kind='STUDENT' AND "isActive" GROUP BY "userId" HAVING count(*)>1) THEN RAISE EXCEPTION 'ROSTER_RECONCILIATION_REQUIRED: multiple student programs'; END IF;
END $preflight$;
UPDATE "User" SET email=lower(btrim(email)) WHERE email IS DISTINCT FROM lower(btrim(email));
UPDATE "User" SET "studentNumber"=upper(coalesce(nullif(btrim("studentNumber"),''),nullif(btrim("uniqueId"),''))), "uniqueId"=coalesce(upper(coalesce(nullif(btrim("studentNumber"),''),nullif(btrim("uniqueId"),''))),'') WHERE upper(role)='STUDENT';
UPDATE "User" SET "studentNumber"=NULL WHERE "studentNumber" IS NOT NULL AND btrim("studentNumber")='';
-- The compatibility migration must precede identity reconciliation.
CREATE UNIQUE INDEX "User_studentNumber_key" ON "User"("studentNumber");
CREATE UNIQUE INDEX "User_studentNumber_normalized_key" ON "User"(upper(btrim("studentNumber"))) WHERE "studentNumber" IS NOT NULL;
COMMIT;
