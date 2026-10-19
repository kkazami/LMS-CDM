-- Proposed PROGRAM HEAD / ICS ORGANIZATIONAL CHART ONLY. Not authorized for shared execution.
-- Existing Calendar, account credentials, roles, and memberships are not modified.
BEGIN;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $preflight$
BEGIN
 IF to_regclass('public."AcademicProgram"') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public."Course"'::regclass AND attname='programId' AND NOT attisdropped) THEN
  RAISE EXCEPTION 'PROGRAM_BASELINE_RECONCILIATION_REQUIRED';
 END IF;
END; $preflight$;
ALTER TABLE public."Course" ADD COLUMN "programId" TEXT;

CREATE TABLE public."AcademicProgram" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "chartVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."ProgramMembership" (
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramMembership_pkey" PRIMARY KEY ("programId","userId")
);

CREATE TABLE public."ProgramHeadAssignment" (
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ProgramHeadAssignment_pkey" PRIMARY KEY ("programId","userId")
);

CREATE TABLE public."ProgramChartNode" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "parentId" TEXT,
    "memberUserId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProgramChartNode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicProgram_instituteId_code_key" ON public."AcademicProgram"("instituteId", "code");

CREATE UNIQUE INDEX "AcademicProgram_id_instituteId_key" ON public."AcademicProgram"("id", "instituteId");

CREATE INDEX "ProgramMembership_userId_isActive_idx" ON public."ProgramMembership"("userId", "isActive");

CREATE INDEX "ProgramChartNode_programId_parentId_position_idx" ON public."ProgramChartNode"("programId", "parentId", "position");

CREATE UNIQUE INDEX "ProgramChartNode_id_programId_key" ON public."ProgramChartNode"("id", "programId");

CREATE UNIQUE INDEX "ProgramChartNode_programId_memberUserId_key" ON public."ProgramChartNode"("programId", "memberUserId");

CREATE UNIQUE INDEX "User_id_instituteId_key" ON public."User"("id", "instituteId");

ALTER TABLE public."Course" ADD CONSTRAINT "Course_programId_instituteId_fkey" FOREIGN KEY ("programId", "instituteId") REFERENCES public."AcademicProgram"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."AcademicProgram" ADD CONSTRAINT "AcademicProgram_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES public."Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProgramMembership" ADD CONSTRAINT "ProgramMembership_programId_instituteId_fkey" FOREIGN KEY ("programId", "instituteId") REFERENCES public."AcademicProgram"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProgramMembership" ADD CONSTRAINT "ProgramMembership_userId_instituteId_fkey" FOREIGN KEY ("userId", "instituteId") REFERENCES public."User"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProgramHeadAssignment" ADD CONSTRAINT "ProgramHeadAssignment_programId_userId_fkey" FOREIGN KEY ("programId", "userId") REFERENCES public."ProgramMembership"("programId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProgramHeadAssignment" ADD CONSTRAINT "ProgramHeadAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProgramChartNode" ADD CONSTRAINT "ProgramChartNode_programId_fkey" FOREIGN KEY ("programId") REFERENCES public."AcademicProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProgramChartNode" ADD CONSTRAINT "ProgramChartNode_programId_memberUserId_fkey" FOREIGN KEY ("programId", "memberUserId") REFERENCES public."ProgramMembership"("programId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProgramChartNode" ADD CONSTRAINT "ProgramChartNode_parentId_programId_fkey" FOREIGN KEY ("parentId", "programId") REFERENCES public."ProgramChartNode"("id", "programId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Assignments are administrative input, never app-minted permissions. No fixed deployment role names.
CREATE UNIQUE INDEX "ProgramMembership_one_student_home" ON public."ProgramMembership" ("userId") WHERE "kind"='STUDENT' AND "isActive";
ALTER TABLE public."ProgramMembership" ADD CONSTRAINT "ProgramMembership_kind_check" CHECK ("kind" IN ('INSTRUCTOR','STUDENT'));
ALTER TABLE public."ProgramHeadAssignment" ADD CONSTRAINT "ProgramHeadAssignment_revocation_check" CHECK (NOT "isActive" OR "revokedAt" IS NULL);
ALTER TABLE public."AcademicProgram" ADD CONSTRAINT "AcademicProgram_bounds" CHECK (length("code") BETWEEN 1 AND 32 AND length("name") BETWEEN 1 AND 160 AND "chartVersion">0);
CREATE FUNCTION public.academic_assignment_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $guard$
DECLARE p text; u text; r text; a text;
BEGIN
 -- The chart revision counter is not an authorization assignment.
 IF TG_TABLE_NAME='AcademicProgram' AND TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'chartVersion')=(to_jsonb(OLD)-'chartVersion') AND (to_jsonb(NEW)->>'chartVersion')::integer=(to_jsonb(OLD)->>'chartVersion')::integer+1 THEN RETURN NEW; END IF;
 END IF;
 IF NOT pg_has_role(session_user,current_user,'MEMBER') THEN RAISE EXCEPTION 'academic assignments require migration-owner authority' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='Course' THEN
   IF TG_OP='INSERT' AND NEW."programId" IS NULL THEN RETURN NEW; END IF;
   IF TG_OP='UPDATE' AND NEW."programId" IS NOT DISTINCT FROM OLD."programId" THEN RETURN NEW; END IF;
 END IF;
 p := CASE WHEN TG_TABLE_NAME='AcademicProgram' THEN COALESCE(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id') ELSE COALESCE(to_jsonb(NEW)->>'programId',to_jsonb(OLD)->>'programId') END;
 IF p IS NOT NULL THEN PERFORM id FROM public."AcademicProgram" WHERE id=p FOR UPDATE; END IF;
 IF TG_OP <> 'DELETE' AND TG_TABLE_NAME IN ('ProgramMembership','ProgramHeadAssignment') THEN
   u:=NEW."userId";
   SELECT role INTO r FROM public."User" WHERE id=u AND "isActive" FOR SHARE;
   IF TG_TABLE_NAME='ProgramMembership' THEN IF NEW."isActive" AND NOT ((NEW.kind='STUDENT' AND upper(r)='STUDENT') OR (NEW.kind='INSTRUCTOR' AND upper(r) IN ('INSTRUCTOR','PROFESSOR','TEACHER'))) THEN RAISE EXCEPTION 'ineligible membership'; END IF; END IF;
   IF TG_TABLE_NAME='ProgramHeadAssignment' AND NEW."isActive" AND NOT EXISTS (SELECT 1 FROM public."ProgramMembership" m JOIN public."User" u ON u.id=m."userId" WHERE m."programId"=p AND m."userId"=NEW."userId" AND m."isActive" AND m.kind='INSTRUCTOR' AND u."isActive" AND upper(u.role) IN ('INSTRUCTOR','PROFESSOR','TEACHER')) THEN RAISE EXCEPTION 'ineligible head'; END IF;
 END IF;
 a:=current_setting('lms.assignment_actor_id',true);
 IF a IS NULL OR NOT EXISTS(SELECT 1 FROM public."User" WHERE id=a) THEN RAISE EXCEPTION 'assignment audit anchor required'; END IF;
 INSERT INTO public."AuditLog" (id,"adminId",action,"targetId",metadata,"createdAt") VALUES (gen_random_uuid()::text,a,'ACADEMIC_STRUCTURE_SETUP',COALESCE(u,a),jsonb_build_object('programId',p,'table',TG_TABLE_NAME,'operation',TG_OP,'attribution','NON_AUTH_USER_FK_ANCHOR','databasePrincipal',session_user)::text,CURRENT_TIMESTAMP);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.academic_assignment_guard() FROM PUBLIC;
CREATE TRIGGER academic_program_guard BEFORE INSERT OR UPDATE OR DELETE ON public."AcademicProgram" FOR EACH ROW EXECUTE FUNCTION public.academic_assignment_guard();
CREATE TRIGGER academic_membership_guard BEFORE INSERT OR UPDATE OR DELETE ON public."ProgramMembership" FOR EACH ROW EXECUTE FUNCTION public.academic_assignment_guard();
CREATE TRIGGER academic_head_guard BEFORE INSERT OR UPDATE OR DELETE ON public."ProgramHeadAssignment" FOR EACH ROW EXECUTE FUNCTION public.academic_assignment_guard();
-- Ordinary class operations remain available when the program relation is unchanged.
CREATE FUNCTION public.academic_course_mapping_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $guard$
BEGIN
 IF (TG_OP='INSERT' AND NEW."programId" IS NULL) OR (TG_OP='UPDATE' AND NEW."programId" IS NOT DISTINCT FROM OLD."programId") THEN RETURN NEW; END IF;
 IF NOT pg_has_role(session_user,current_user,'MEMBER') THEN RAISE EXCEPTION 'course program mapping requires migration-owner authority' USING ERRCODE='42501'; END IF;
 IF nullif(current_setting('lms.assignment_actor_id',true),'') IS NULL THEN RAISE EXCEPTION 'mapping audit anchor required'; END IF;
 INSERT INTO public."AuditLog" (id,"adminId",action,"targetId",metadata,"createdAt") VALUES (gen_random_uuid()::text,current_setting('lms.assignment_actor_id'),'ACADEMIC_COURSE_MAPPING',current_setting('lms.assignment_actor_id'),jsonb_build_object('courseId',NEW.id,'programId',NEW."programId",'databasePrincipal',session_user)::text,CURRENT_TIMESTAMP);
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.academic_course_mapping_guard() FROM PUBLIC;
CREATE TRIGGER academic_course_mapping_guard BEFORE INSERT OR UPDATE ON public."Course" FOR EACH ROW EXECUTE FUNCTION public.academic_course_mapping_guard();
CREATE UNIQUE INDEX "ProgramChartNode_one_root" ON public."ProgramChartNode" ("programId") WHERE kind='ROOT';
ALTER TABLE public."ProgramChartNode" ADD CONSTRAINT "ProgramChartNode_shape" CHECK (length(label) BETWEEN 1 AND 120 AND position BETWEEN 0 AND 10000 AND ((kind='ROOT' AND "parentId" IS NULL AND "memberUserId" IS NULL) OR (kind='GROUP' AND "parentId" IS NOT NULL AND "memberUserId" IS NULL) OR (kind='INSTRUCTOR' AND "parentId" IS NOT NULL AND "memberUserId" IS NOT NULL)));
CREATE FUNCTION public.academic_chart_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $guard$
DECLARE p text; cursor_id text; depth integer:=0;
BEGIN
 p:=CASE WHEN TG_OP='DELETE' THEN OLD."programId" ELSE NEW."programId" END;
 PERFORM id FROM public."AcademicProgram" WHERE id=p FOR UPDATE;
 IF TG_OP='DELETE' THEN IF OLD.kind='ROOT' THEN RAISE EXCEPTION 'program root is protected'; END IF; RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND (OLD.kind='ROOT' OR NEW."programId"<>OLD."programId" OR NEW.kind<>OLD.kind OR NEW."memberUserId" IS DISTINCT FROM OLD."memberUserId") THEN RAISE EXCEPTION 'immutable chart identity'; END IF;
 IF NEW.kind='ROOT' AND NOT pg_has_role(session_user,current_user,'MEMBER') THEN RAISE EXCEPTION 'root requires setup authority'; END IF;
 IF TG_OP='INSERT' AND (SELECT count(*) FROM public."ProgramChartNode" WHERE "programId"=p)>=300 THEN RAISE EXCEPTION 'chart limit reached'; END IF;
 IF NEW.kind='INSTRUCTOR' AND NOT EXISTS(SELECT 1 FROM public."ProgramMembership" WHERE "programId"=p AND "userId"=NEW."memberUserId" AND kind='INSTRUCTOR' AND "isActive") THEN RAISE EXCEPTION 'ineligible chart member'; END IF;
 cursor_id:=NEW."parentId";
 WHILE cursor_id IS NOT NULL LOOP
  IF cursor_id=NEW.id THEN RAISE EXCEPTION 'chart cycle'; END IF;
  depth:=depth+1; IF depth>12 THEN RAISE EXCEPTION 'chart depth limit'; END IF;
  SELECT "parentId" INTO cursor_id FROM public."ProgramChartNode" WHERE id=cursor_id AND "programId"=p;
 END LOOP;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.academic_chart_guard() FROM PUBLIC;
CREATE TRIGGER academic_chart_guard BEFORE INSERT OR UPDATE OR DELETE ON public."ProgramChartNode" FOR EACH ROW EXECUTE FUNCTION public.academic_chart_guard();

COMMIT;
