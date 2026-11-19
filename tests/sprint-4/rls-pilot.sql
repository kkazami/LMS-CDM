\set ON_ERROR_STOP on
CREATE ROLE sprint4_runtime NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA pilot;
CREATE TABLE pilot.course (
  id text PRIMARY KEY,
  institute_id text NOT NULL,
  instructor_id text NOT NULL,
  title text NOT NULL
);
CREATE TABLE pilot.enrollment (
  course_id text REFERENCES pilot.course (id),
  student_id text,
  status text NOT NULL,
  PRIMARY KEY (course_id, student_id)
);
INSERT INTO pilot.course VALUES
  ('ics-101', 'ics', 'teacher-a', 'Synthetic A'),
  ('ics-102', 'ics', 'teacher-b', 'Synthetic B'),
  ('ibe-101', 'ibe', 'teacher-c', 'Synthetic C');
INSERT INTO pilot.enrollment VALUES ('ics-101', 'study-a', 'APPROVED'), ('ics-102', 'study-a', 'PENDING');

CREATE FUNCTION pilot.can_read_course(course_id text, institute text, instructor text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT institute = nullif(current_setting('lms.institute', true), '') AND
    CASE nullif(current_setting('lms.role', true), '')
      WHEN 'ADMIN' THEN nullif(current_setting('lms.actor', true), '') IS NOT NULL
      WHEN 'INSTRUCTOR' THEN instructor = nullif(current_setting('lms.actor', true), '')
      WHEN 'STUDENT' THEN EXISTS (
        SELECT 1 FROM pilot.enrollment AS e WHERE e.course_id = $1
          AND e.student_id = nullif(current_setting('lms.actor', true), '') AND e.status = 'APPROVED'
      )
      ELSE false
    END
$$;
REVOKE ALL ON FUNCTION pilot.can_read_course(text, text, text) FROM PUBLIC;
GRANT USAGE ON SCHEMA pilot TO sprint4_runtime;
GRANT EXECUTE ON FUNCTION pilot.can_read_course(text, text, text) TO sprint4_runtime;
GRANT SELECT ON pilot.course TO sprint4_runtime;
ALTER TABLE pilot.course ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot.course FORCE ROW LEVEL SECURITY;
CREATE POLICY course_read ON pilot.course FOR SELECT TO sprint4_runtime
  USING (pilot.can_read_course(id, institute_id, instructor_id));
