BEGIN;
-- Use the existing private, single-statement permit boundary for course mappings.
CREATE OR REPLACE FUNCTION public.academic_course_mapping_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $guard$
DECLARE permitted boolean := false;
BEGIN
 IF (TG_OP='INSERT' AND NEW."programId" IS NULL) OR (TG_OP='UPDATE' AND NEW."programId" IS NOT DISTINCT FROM OLD."programId") THEN RETURN NEW; END IF;
 DELETE FROM super_user_security.academic_assignment_permits
 WHERE backend=pg_backend_pid() AND transaction_id=txid_current() AND table_name='Course'
 AND operation=TG_OP AND program_id=coalesce(NEW."programId",'') AND user_id=NEW.id
 RETURNING true INTO permitted;
 IF coalesce(permitted,false) THEN RETURN NEW; END IF;
 IF NOT pg_has_role(session_user,current_user,'MEMBER') THEN RAISE EXCEPTION 'course program mapping requires administrator authority' USING ERRCODE='42501'; END IF;
 IF nullif(current_setting('lms.assignment_actor_id',true),'') IS NULL THEN RAISE EXCEPTION 'mapping audit anchor required'; END IF;
 INSERT INTO public."AuditLog" (id,"adminId",action,"targetId",metadata,"createdAt") VALUES (gen_random_uuid()::text,current_setting('lms.assignment_actor_id'),'ACADEMIC_COURSE_MAPPING',current_setting('lms.assignment_actor_id'),jsonb_build_object('courseId',NEW.id,'programId',NEW."programId",'databasePrincipal',session_user)::text,CURRENT_TIMESTAMP);
 RETURN NEW;
END $guard$;

CREATE OR REPLACE FUNCTION super_user_security.set_course_program(
 session_id text, expected_token_hash text, course_id text, selected_program text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $function$
DECLARE actor_id text; institute_id text; previous_program text; actor_role text; teacher_id text;
BEGIN
 IF NOT super_user_security.application_boundary_qualified() OR has_table_privilege(session_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'unqualified application principal' USING ERRCODE='42501'; END IF;
 SELECT "userId" INTO actor_id FROM public."Session" WHERE id=session_id;
 PERFORM id FROM public."User" WHERE id=actor_id FOR UPDATE;
 SELECT u."instituteId", upper(u.role) INTO institute_id, actor_role FROM public."Session" s
 JOIN public."User" u ON u.id=s."userId" JOIN public."Institute" i ON i.id=u."instituteId"
 WHERE s.id=session_id AND s."tokenHash"=expected_token_hash AND s."expiresAt">clock_timestamp()
 AND upper(u.role) IN ('ADMIN','PROFESSOR','TEACHER','INSTRUCTOR') AND u."isActive" AND i.code IN ('ics','ibe','ite')
 AND (u."credentialProvisioningState" IS NULL OR u."credentialProvisioningState"='COMPLETE');
 IF institute_id IS NULL THEN RAISE EXCEPTION 'instructor or administrator admission required' USING ERRCODE='42501'; END IF;
 IF selected_program IS NOT NULL THEN
  PERFORM id FROM public."AcademicProgram" WHERE id=selected_program AND "instituteId"=institute_id AND "isActive" FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'active program not found' USING ERRCODE='P0002'; END IF;
 END IF;
 SELECT "programId", "instructorId" INTO previous_program, teacher_id FROM public."Course" WHERE id=course_id AND "instituteId"=institute_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'class not found' USING ERRCODE='P0002'; END IF;
 IF actor_role<>'ADMIN' AND teacher_id IS DISTINCT FROM actor_id THEN RAISE EXCEPTION 'only the assigned instructor may edit this class' USING ERRCODE='42501'; END IF;
 IF previous_program IS NOT DISTINCT FROM selected_program THEN RETURN; END IF;
 INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),'Course','UPDATE',coalesce(selected_program,''),course_id);
 UPDATE public."Course" SET "programId"=selected_program WHERE id=course_id;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata,"createdAt") VALUES(gen_random_uuid()::text,actor_id,actor_id,CASE WHEN actor_role='ADMIN' THEN 'ADMIN_COURSE_PROGRAM_SET' ELSE 'INSTRUCTOR_COURSE_PROGRAM_SET' END,jsonb_build_object('instituteId',institute_id,'courseId',course_id,'previousProgramId',previous_program,'programId',selected_program,'result','SUCCESS')::text,clock_timestamp());
END $function$;
REVOKE ALL ON FUNCTION super_user_security.set_course_program(text,text,text,text) FROM PUBLIC;
DO $grants$
DECLARE binding record;
BEGIN
 FOR binding IN SELECT principal FROM super_user_security.writer_bindings WHERE kind='APPLICATION' AND enabled LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION super_user_security.set_course_program(text,text,text,text) TO %I',binding.principal);
 END LOOP;
END $grants$;
COMMIT;
