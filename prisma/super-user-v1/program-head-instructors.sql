BEGIN;
CREATE OR REPLACE FUNCTION super_user_security.add_program_instructor(
 session_id text, expected_token_hash text, selected_program text, target_user text, expected_version integer
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $function$
DECLARE actor_id text; institute_id text; current_version integer; operation_name text;
BEGIN
 IF expected_version IS NULL OR expected_version<1 OR selected_program IS NULL OR target_user IS NULL THEN RAISE EXCEPTION 'invalid faculty request' USING ERRCODE='22023'; END IF;
 IF NOT super_user_security.application_boundary_qualified() OR has_table_privilege(session_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'unqualified application principal' USING ERRCODE='42501'; END IF;
 SELECT "userId" INTO actor_id FROM public."Session" WHERE id=session_id;
 PERFORM id FROM public."User" WHERE id IN (actor_id,target_user) ORDER BY id FOR UPDATE;
 SELECT u."instituteId" INTO institute_id FROM public."Session" s
 JOIN public."User" u ON u.id=s."userId" JOIN public."Institute" i ON i.id=u."instituteId"
 WHERE s.id=session_id AND s."tokenHash"=expected_token_hash AND s."expiresAt">clock_timestamp()
 AND upper(u.role) IN ('PROFESSOR','TEACHER','INSTRUCTOR') AND u."isActive" AND i.code='ics'
 AND (u."credentialProvisioningState" IS NULL OR u."credentialProvisioningState"='COMPLETE');
 IF institute_id IS NULL THEN RAISE EXCEPTION 'instructor admission required' USING ERRCODE='42501'; END IF;
 SELECT "chartVersion" INTO current_version FROM public."AcademicProgram" WHERE id=selected_program AND "instituteId"=institute_id AND "isActive" FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'program not found' USING ERRCODE='P0002'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."ProgramMembership" m JOIN public."ProgramHeadAssignment" h ON h."programId"=m."programId" AND h."userId"=m."userId" WHERE m."programId"=selected_program AND m."userId"=actor_id AND m."instituteId"=institute_id AND m.kind='INSTRUCTOR' AND m."isActive" AND h."isActive" AND h."revokedAt" IS NULL) THEN RAISE EXCEPTION 'current program head required' USING ERRCODE='42501'; END IF;
 IF current_version<>expected_version THEN RAISE EXCEPTION 'program changed' USING ERRCODE='40001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."User" WHERE id=target_user AND "instituteId"=institute_id AND "isActive" AND upper(role) IN ('PROFESSOR','TEACHER','INSTRUCTOR') AND ("credentialProvisioningState" IS NULL OR "credentialProvisioningState"='COMPLETE')) THEN RAISE EXCEPTION 'eligible institute instructor required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public."ProgramMembership" WHERE "programId"=selected_program AND "userId"=target_user AND "isActive") OR EXISTS(SELECT 1 FROM public."ProgramHeadAssignment" WHERE "programId"=selected_program AND "userId"=target_user AND "isActive" AND "revokedAt" IS NULL) THEN RAISE EXCEPTION 'already assigned or protected designation' USING ERRCODE='23505'; END IF;
 operation_name:=CASE WHEN EXISTS(SELECT 1 FROM public."ProgramMembership" WHERE "programId"=selected_program AND "userId"=target_user) THEN 'UPDATE' ELSE 'INSERT' END;
 INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),'ProgramMembership',operation_name,selected_program,target_user);
 IF operation_name='INSERT' THEN INSERT INTO public."ProgramMembership"("programId","userId","instituteId",kind) VALUES(selected_program,target_user,institute_id,'INSTRUCTOR');
 ELSE UPDATE public."ProgramMembership" SET kind='INSTRUCTOR',"isActive"=true WHERE "programId"=selected_program AND "userId"=target_user; END IF;
 UPDATE public."AcademicProgram" SET "chartVersion"="chartVersion"+1 WHERE id=selected_program;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata,"createdAt") VALUES(gen_random_uuid()::text,actor_id,target_user,'PROGRAM_INSTRUCTOR_ADDED',jsonb_build_object('instituteId',institute_id,'programId',selected_program,'version',current_version+1,'result','SUCCESS')::text,clock_timestamp());
 RETURN current_version+1;
END $function$;
REVOKE ALL ON FUNCTION super_user_security.add_program_instructor(text,text,text,text,integer) FROM PUBLIC;
DO $grants$
DECLARE binding record;
BEGIN
 FOR binding IN SELECT principal FROM super_user_security.writer_bindings WHERE kind='APPLICATION' AND enabled LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION super_user_security.add_program_instructor(text,text,text,text,integer) TO %I',binding.principal);
 END LOOP;
END $grants$;
COMMIT;
