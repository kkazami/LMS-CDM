BEGIN;
-- Only this definer can mint a one-statement, transaction-bound assignment permit.
CREATE TABLE super_user_security.academic_assignment_permits (
 backend integer NOT NULL, transaction_id bigint NOT NULL, table_name text NOT NULL,
 operation text NOT NULL, program_id text NOT NULL, user_id text NOT NULL,
 PRIMARY KEY (backend, transaction_id, table_name)
);
REVOKE ALL ON super_user_security.academic_assignment_permits FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.academic_assignment_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $guard$
DECLARE p text; u text; r text; a text; permitted boolean := false;
BEGIN
 IF NOT pg_has_role(session_user,current_user,'MEMBER') AND has_table_privilege(session_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') THEN
  RAISE EXCEPTION 'assignment permit boundary is not qualified' USING ERRCODE='42501';
 END IF;
 IF TG_TABLE_NAME='AcademicProgram' AND TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'chartVersion')=(to_jsonb(OLD)-'chartVersion') AND (to_jsonb(NEW)->>'chartVersion')::integer=(to_jsonb(OLD)->>'chartVersion')::integer+1 THEN RETURN NEW; END IF;
 END IF;
 p := CASE WHEN TG_TABLE_NAME='AcademicProgram' THEN COALESCE(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id') ELSE COALESCE(to_jsonb(NEW)->>'programId',to_jsonb(OLD)->>'programId') END;
 IF TG_TABLE_NAME IN ('ProgramMembership','ProgramHeadAssignment') AND TG_OP IN ('INSERT','UPDATE') THEN
  DELETE FROM super_user_security.academic_assignment_permits
  WHERE backend=pg_backend_pid() AND transaction_id=txid_current() AND table_name=TG_TABLE_NAME
    AND operation=TG_OP AND program_id=p AND user_id=NEW."userId" RETURNING true INTO permitted;
 END IF;
 IF NOT pg_has_role(session_user,current_user,'MEMBER') AND NOT coalesce(permitted,false) THEN
  RAISE EXCEPTION 'academic assignments require authorized assignment authority' USING ERRCODE='42501';
 END IF;
 IF p IS NOT NULL THEN PERFORM id FROM public."AcademicProgram" WHERE id=p FOR UPDATE; END IF;
 IF TG_OP <> 'DELETE' AND TG_TABLE_NAME IN ('ProgramMembership','ProgramHeadAssignment') THEN
  u:=NEW."userId";
  SELECT role INTO r FROM public."User" WHERE id=u AND "isActive" FOR SHARE;
  IF TG_TABLE_NAME='ProgramMembership' THEN
   IF NEW."isActive" AND NOT coalesce((NEW.kind='STUDENT' AND upper(r)='STUDENT') OR (NEW.kind='INSTRUCTOR' AND upper(r) IN ('INSTRUCTOR','PROFESSOR','TEACHER')),false) THEN RAISE EXCEPTION 'ineligible membership'; END IF;
  END IF;
  IF TG_TABLE_NAME='ProgramHeadAssignment' AND NEW."isActive" AND NOT EXISTS (SELECT 1 FROM public."ProgramMembership" m JOIN public."User" u ON u.id=m."userId" WHERE m."programId"=p AND m."userId"=NEW."userId" AND m."isActive" AND m.kind='INSTRUCTOR' AND u."isActive" AND upper(u.role) IN ('INSTRUCTOR','PROFESSOR','TEACHER')) THEN RAISE EXCEPTION 'ineligible head'; END IF;
 END IF;
 -- The definer writes its own accountable audit in the same transaction.
 IF coalesce(permitted,false) THEN RETURN NEW; END IF;
 a:=current_setting('lms.assignment_actor_id',true);
 IF a IS NULL OR NOT EXISTS(SELECT 1 FROM public."User" WHERE id=a) THEN RAISE EXCEPTION 'assignment audit anchor required'; END IF;
 INSERT INTO public."AuditLog" (id,"adminId",action,"targetId",metadata,"createdAt") VALUES (gen_random_uuid()::text,a,'ACADEMIC_STRUCTURE_SETUP',COALESCE(u,a),jsonb_build_object('programId',p,'table',TG_TABLE_NAME,'operation',TG_OP,'attribution','NON_AUTH_USER_FK_ANCHOR','databasePrincipal',session_user)::text,CURRENT_TIMESTAMP);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.academic_assignment_guard() FROM PUBLIC;

CREATE FUNCTION super_user_security.set_ics_faculty(
 session_id text, expected_token_hash text, selected_program text, target_user text,
 designation text, expected_version integer
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $function$
DECLARE actor_id text; institute_id text; current_version integer; previous_head boolean; operation_name text;
BEGIN
 IF session_id IS NULL OR expected_token_hash IS NULL OR selected_program IS NULL OR target_user IS NULL
 OR designation IS NULL OR designation NOT IN ('FACULTY','PROGRAM_HEAD') OR expected_version IS NULL THEN
  RAISE EXCEPTION 'invalid designation request' USING ERRCODE='22023';
 END IF;
 IF NOT super_user_security.application_boundary_qualified() OR has_table_privilege(session_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'unqualified application principal' USING ERRCODE='42501'; END IF;
 SELECT "userId" INTO actor_id FROM public."Session" WHERE id=session_id;
 -- Same stable account-lock order used by session admission and status operations.
 PERFORM id FROM public."User" WHERE id IN (actor_id,target_user) ORDER BY id FOR UPDATE;
 SELECT u."instituteId" INTO institute_id FROM public."Session" s
 JOIN public."User" u ON u.id=s."userId" JOIN public."Institute" i ON i.id=u."instituteId"
 WHERE s.id=session_id AND s."userId"=actor_id AND s."tokenHash"=expected_token_hash
 AND s."expiresAt">clock_timestamp() AND u.role='INSTITUTE_ADMIN' AND u."isActive"
 AND u."credentialProvisioningState"='COMPLETE' AND i.code='ics';
 IF institute_id IS NULL THEN RAISE EXCEPTION 'ICS administrator admission required' USING ERRCODE='42501'; END IF;
 SELECT "chartVersion" INTO current_version FROM public."AcademicProgram"
 WHERE id=selected_program AND "instituteId"=institute_id AND "isActive" FOR UPDATE;
 IF current_version IS NULL THEN RAISE EXCEPTION 'program not found' USING ERRCODE='P0002'; END IF;
 IF current_version<>expected_version THEN RAISE EXCEPTION 'faculty changed; refresh before saving' USING ERRCODE='40001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."User" WHERE id=target_user AND "instituteId"=institute_id AND "isActive" AND upper(role) IN ('INSTRUCTOR','PROFESSOR','TEACHER')) THEN RAISE EXCEPTION 'active ICS instructor required' USING ERRCODE='42501'; END IF;
 SELECT "isActive" AND "revokedAt" IS NULL INTO previous_head FROM public."ProgramHeadAssignment" WHERE "programId"=selected_program AND "userId"=target_user;
 -- Avoid UPSERT: INSERT and UPDATE triggers must each consume precisely one permit.
 operation_name:=CASE WHEN EXISTS(SELECT 1 FROM public."ProgramMembership" WHERE "programId"=selected_program AND "userId"=target_user) THEN 'UPDATE' ELSE 'INSERT' END;
 INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),'ProgramMembership',operation_name,selected_program,target_user);
 IF operation_name='INSERT' THEN INSERT INTO public."ProgramMembership"("programId","userId","instituteId",kind) VALUES(selected_program,target_user,institute_id,'INSTRUCTOR');
 ELSE UPDATE public."ProgramMembership" SET kind='INSTRUCTOR',"isActive"=true WHERE "programId"=selected_program AND "userId"=target_user; END IF;
 operation_name:=CASE WHEN EXISTS(SELECT 1 FROM public."ProgramHeadAssignment" WHERE "programId"=selected_program AND "userId"=target_user) THEN 'UPDATE' ELSE 'INSERT' END;
 INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),'ProgramHeadAssignment',operation_name,selected_program,target_user);
 IF operation_name='INSERT' THEN INSERT INTO public."ProgramHeadAssignment"("programId","userId","isActive","revokedAt") VALUES(selected_program,target_user,designation='PROGRAM_HEAD',CASE WHEN designation='FACULTY' THEN clock_timestamp() ELSE NULL END);
 ELSE UPDATE public."ProgramHeadAssignment" SET "isActive"=designation='PROGRAM_HEAD',"revokedAt"=CASE WHEN designation='FACULTY' THEN clock_timestamp() ELSE NULL END,"assignedAt"=CASE WHEN designation='PROGRAM_HEAD' THEN clock_timestamp() ELSE "assignedAt" END WHERE "programId"=selected_program AND "userId"=target_user; END IF;
 UPDATE public."AcademicProgram" SET "chartVersion"="chartVersion"+1 WHERE id=selected_program;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata,"createdAt") VALUES(gen_random_uuid()::text,actor_id,target_user,'ICS_FACULTY_DESIGNATION_SET',jsonb_build_object('programId',selected_program,'instituteId',institute_id,'beforeHead',coalesce(previous_head,false),'designation',designation,'version',current_version+1,'correlationId',gen_random_uuid()::text,'result','SUCCESS')::text,clock_timestamp());
 RETURN current_version+1;
END $function$;
REVOKE ALL ON FUNCTION super_user_security.set_ics_faculty(text,text,text,text,text,integer) FROM PUBLIC;
-- Grant only EXECUTE to the separately qualified APP principal during deployment.
-- No table access to permits, owner membership, operator credential or session setting is granted.
COMMIT;
