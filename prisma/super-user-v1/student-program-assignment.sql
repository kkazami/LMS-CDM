BEGIN;
CREATE OR REPLACE FUNCTION super_user_security.set_student_program(
 session_id text, expected_token_hash text, target_user text, selected_program text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $function$
DECLARE actor_id text; institute_id text; previous record; operation_name text;
BEGIN
 IF NOT super_user_security.application_boundary_qualified() OR has_table_privilege(session_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') THEN
  RAISE EXCEPTION 'unqualified application principal' USING ERRCODE='42501';
 END IF;
 SELECT "userId" INTO actor_id FROM public."Session" WHERE id=session_id;
 PERFORM id FROM public."User" WHERE id IN (actor_id,target_user) ORDER BY id FOR UPDATE;
 SELECT u."instituteId" INTO institute_id FROM public."Session" s JOIN public."User" u ON u.id=s."userId" JOIN public."Institute" i ON i.id=u."instituteId"
 WHERE s.id=session_id AND s."tokenHash"=expected_token_hash AND s."expiresAt">clock_timestamp()
 AND u.role='ADMIN' AND u."isActive" AND u."activationStatus"='ACTIVE'
 AND (u."credentialProvisioningState" IS NULL OR u."credentialProvisioningState"='COMPLETE') AND i.code IN ('ics','ibe','ite');
 IF institute_id IS NULL THEN RAISE EXCEPTION 'administrator required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."User" WHERE id=target_user AND "instituteId"=institute_id AND upper(role)='STUDENT' AND "isActive") THEN
  RAISE EXCEPTION 'eligible student required' USING ERRCODE='42501'; END IF;
 PERFORM id FROM public."AcademicProgram" WHERE id=selected_program AND "instituteId"=institute_id AND "isActive" FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'active program not found' USING ERRCODE='P0002'; END IF;
 FOR previous IN SELECT "programId" FROM public."ProgramMembership" WHERE "userId"=target_user AND kind='STUDENT' AND "isActive" AND "programId"<>selected_program ORDER BY "programId" LOOP
  INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),'ProgramMembership','UPDATE',previous."programId",target_user);
  UPDATE public."ProgramMembership" SET "isActive"=false WHERE "programId"=previous."programId" AND "userId"=target_user;
 END LOOP;
 operation_name:=CASE WHEN EXISTS(SELECT 1 FROM public."ProgramMembership" WHERE "programId"=selected_program AND "userId"=target_user) THEN 'UPDATE' ELSE 'INSERT' END;
 INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),'ProgramMembership',operation_name,selected_program,target_user);
 IF operation_name='INSERT' THEN INSERT INTO public."ProgramMembership"("programId","userId","instituteId",kind) VALUES(selected_program,target_user,institute_id,'STUDENT');
 ELSE UPDATE public."ProgramMembership" SET kind='STUDENT',"isActive"=true WHERE "programId"=selected_program AND "userId"=target_user; END IF;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata,"createdAt") VALUES(gen_random_uuid()::text,actor_id,target_user,'STUDENT_PROGRAM_SET',jsonb_build_object('programId',selected_program,'instituteId',institute_id)::text,clock_timestamp());
END $function$;
REVOKE ALL ON FUNCTION super_user_security.set_student_program(text,text,text,text) FROM PUBLIC;
DO $grants$
DECLARE binding record;
BEGIN
 FOR binding IN SELECT principal FROM super_user_security.writer_bindings WHERE kind='APPLICATION' AND enabled LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION super_user_security.set_student_program(text,text,text,text) TO %I',binding.principal);
 END LOOP;
END $grants$;
COMMIT;
