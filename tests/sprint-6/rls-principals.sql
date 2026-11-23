-- Run after the Sprint 5 RLS fixture in an approved disposable cluster only.
CREATE ROLE sprint6_policy NOLOGIN;
CREATE ROLE sprint6_course_owner NOLOGIN;
CREATE ROLE sprint6_backup LOGIN;

GRANT USAGE ON SCHEMA sprint5_context TO sprint6_policy;
GRANT EXECUTE ON FUNCTION sprint5_context.can_edit(text, text) TO sprint6_policy;
GRANT SELECT ("courseId", "studentId", status) ON public."Enrollment" TO sprint6_policy;
ALTER FUNCTION sprint5_context.can_read(text, text, text) OWNER TO sprint6_policy;
ALTER TABLE public."Course" OWNER TO sprint6_course_owner;

GRANT SELECT ON public."Course" TO sprint6_backup;
CREATE POLICY sprint6_course_backup ON public."Course" FOR SELECT TO sprint6_backup USING (true);
