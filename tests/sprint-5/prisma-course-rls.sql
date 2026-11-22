-- Disposable fixture for current-schema Prisma qualification. Never apply to deployed databases.
CREATE ROLE sprint5_runtime LOGIN;
CREATE ROLE sprint5_job LOGIN;
CREATE SCHEMA sprint5_context;
REVOKE ALL ON SCHEMA sprint5_context FROM PUBLIC;
GRANT USAGE ON SCHEMA sprint5_context TO sprint5_runtime;
REVOKE ALL ON public."Course", public."Enrollment" FROM PUBLIC;
GRANT SELECT, UPDATE ("title", "updatedAt") ON public."Course" TO sprint5_runtime;
GRANT SELECT ("id", "instituteId") ON public."Course" TO sprint5_job;

CREATE FUNCTION sprint5_context.can_edit(institute text, instructor text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog
AS $$
  SELECT institute = nullif(current_setting('lms.institute_id', true), '')
    AND (current_setting('lms.actor_role', true) = 'ADMIN'
      OR (current_setting('lms.actor_role', true) = 'INSTRUCTOR'
        AND instructor = nullif(current_setting('lms.actor_id', true), '')));
$$;
CREATE FUNCTION sprint5_context.can_read(course text, institute text, instructor text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT sprint5_context.can_edit(institute, instructor) OR
    (institute = nullif(current_setting('lms.institute_id', true), '')
      AND current_setting('lms.actor_role', true) = 'STUDENT'
      AND EXISTS (
        SELECT FROM public."Enrollment" e WHERE e."courseId" = course
          AND e."studentId" = nullif(current_setting('lms.actor_id', true), '') AND e.status = 'APPROVED'
      ));
$$;
REVOKE ALL ON FUNCTION sprint5_context.can_edit(text, text), sprint5_context.can_read(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sprint5_context.can_edit(text, text), sprint5_context.can_read(text, text, text) TO sprint5_runtime;

ALTER TABLE public."Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Course" FORCE ROW LEVEL SECURITY;
CREATE POLICY sprint5_course_read ON public."Course" FOR SELECT TO sprint5_runtime
  USING (sprint5_context.can_read(id, "instituteId", "instructorId"));
CREATE POLICY sprint5_course_edit ON public."Course" FOR UPDATE TO sprint5_runtime
  USING (sprint5_context.can_edit("instituteId", "instructorId"))
  WITH CHECK (sprint5_context.can_edit("instituteId", "instructorId"));
CREATE POLICY sprint5_job_catalog ON public."Course" FOR SELECT TO sprint5_job USING (true);
