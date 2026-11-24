\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE sprint4_runtime;
DO $$ BEGIN
  IF (SELECT count(*) FROM pilot.course) <> 0 THEN RAISE EXCEPTION 'Unbound context'; END IF;
  IF has_table_privilege(current_user, 'pilot.course', 'INSERT,UPDATE,DELETE')
     OR has_table_privilege(current_user, 'pilot.enrollment', 'SELECT') THEN RAISE EXCEPTION 'Unexpected runtime grant'; END IF;
END $$;
SET LOCAL lms.institute = 'ics';
SET LOCAL lms.role = 'STUDENT';
SET LOCAL lms.actor = 'study-a';
DO $$ BEGIN
  IF ARRAY(SELECT id FROM pilot.course ORDER BY id) <> ARRAY['ics-101'] THEN RAISE EXCEPTION 'Student scope'; END IF;
END $$;
COMMIT;

BEGIN;
SET LOCAL ROLE sprint4_runtime;
DO $$ BEGIN
  IF (SELECT count(*) FROM pilot.course) <> 0 THEN RAISE EXCEPTION 'Context survived transaction'; END IF;
END $$;
SET LOCAL lms.institute = 'ics';
SET LOCAL lms.role = 'INSTRUCTOR';
SET LOCAL lms.actor = 'teacher-b';
DO $$ BEGIN
  IF ARRAY(SELECT id FROM pilot.course ORDER BY id) <> ARRAY['ics-102'] THEN RAISE EXCEPTION 'Instructor scope'; END IF;
END $$;
SET LOCAL lms.role = 'ADMIN';
SET LOCAL lms.actor = 'admin-a';
DO $$ BEGIN
  IF ARRAY(SELECT id FROM pilot.course ORDER BY id) <> ARRAY['ics-101','ics-102'] THEN RAISE EXCEPTION 'Admin scope'; END IF;
END $$;
COMMIT;
