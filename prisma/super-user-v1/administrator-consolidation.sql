-- Administrator consolidation successor. Does not re-run the installed prefix.
-- Existing ADMIN identities, passwords, status and legacy null handoff state are preserved.
-- No account or program provisioning, Calendar change, grants or principal changes.
-- Refuse unexpected legacy IA rows; their conversion requires a separately reviewed ledger.
BEGIN;
SET LOCAL search_path=pg_catalog,public;
LOCK TABLE public."User" IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public."User" WHERE upper(role)='INSTITUTE_ADMIN') THEN RAISE EXCEPTION 'RETIRED_ROLE_RECONCILIATION_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='super_user_guard' AND tgenabled='A') THEN RAISE EXCEPTION 'EXISTING_BOUNDARY_REQUIRED'; END IF;
END $$;
CREATE OR REPLACE FUNCTION super_user_security.guard_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
DECLARE new_priv boolean := upper(NEW.role) IN ('SUPER_USER','ADMIN'); old_priv boolean := false;
BEGIN
 IF TG_OP<>'DELETE' AND upper(NEW.role)='INSTITUTE_ADMIN' THEN RAISE EXCEPTION 'RETIRED_ROLE_DENIED' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN
   IF upper(OLD.role) IN ('SUPER_USER','ADMIN') THEN RAISE EXCEPTION 'PRIVILEGED_DELETE_DENIED' USING ERRCODE='42501'; END IF;
   RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' THEN old_priv := upper(OLD.role) IN ('SUPER_USER','ADMIN'); END IF;
 IF super_user_security.operator_qualified() THEN
   RETURN NEW; -- Operator has no table DML grants; only bounded functions below.
 END IF;
 IF TG_OP='INSERT' AND NEW."credentialProvisioningState"='COMPLETE' THEN RAISE EXCEPTION 'PROVISIONING_WRITER_DENIED' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' AND new_priv THEN
   IF NOT super_user_security.application_boundary_qualified() OR NEW.role <> 'ADMIN' OR NEW."isActive" OR NEW."credentialProvisioningState" IS DISTINCT FROM 'PENDING_HANDOFF'::public."CredentialProvisioningState" OR NEW.permissions <> '[]' THEN
     RAISE EXCEPTION 'PRIVILEGED_WRITER_DENIED' USING ERRCODE='42501';
   END IF;
 ELSIF TG_OP='UPDATE' THEN
   IF NEW."credentialProvisioningState" IS DISTINCT FROM OLD."credentialProvisioningState" THEN RAISE EXCEPTION 'PROVISIONING_WRITER_DENIED' USING ERRCODE='42501'; END IF;
   IF new_priv <> old_priv OR old_priv AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.password IS DISTINCT FROM OLD.password OR NEW."instituteId" IS DISTINCT FROM OLD."instituteId" OR NEW.permissions IS DISTINCT FROM OLD.permissions) THEN
     RAISE EXCEPTION 'PRIVILEGED_WRITER_DENIED' USING ERRCODE='42501';
   END IF;
   IF old_priv AND (upper(OLD.role)='SUPER_USER' AND NEW."isActive" IS DISTINCT FROM OLD."isActive" OR NOT super_user_security.application_boundary_qualified()) THEN RAISE EXCEPTION 'PRIVILEGED_STATUS_DENIED' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION super_user_security.guard_session() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
DECLARE target public."User";
BEGIN
 SELECT * INTO target FROM public."User" WHERE id=NEW."userId" FOR UPDATE;
 IF NOT FOUND OR NOT target."isActive" OR upper(target.role) NOT IN ('SUPER_USER','ADMIN','INSTRUCTOR','PROFESSOR','TEACHER','STUDENT') THEN RAISE EXCEPTION 'SESSION_ADMISSION_DENIED' USING ERRCODE='42501'; END IF;
 IF upper(target.role) IN ('SUPER_USER','ADMIN') AND (NOT super_user_security.application_boundary_qualified() OR upper(target.role)='SUPER_USER' AND target."credentialProvisioningState" IS DISTINCT FROM 'COMPLETE'::public."CredentialProvisioningState" OR upper(target.role)='ADMIN' AND target."credentialProvisioningState" IS NOT NULL AND target."credentialProvisioningState"<>'COMPLETE') THEN RAISE EXCEPTION 'SESSION_ADMISSION_DENIED' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION super_user_security.complete_handoff(target_id text, institute_id text, expected_password_hash text,
  replacement_password_hash text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
DECLARE target public."User"; prior public."AuditLog"; audit_id text;
BEGIN
 IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_DENIED' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL OR length(btrim(target_id))=0 OR institute_id IS NULL OR length(btrim(institute_id))=0 OR expected_password_hash IS NULL OR length(btrim(expected_password_hash))=0 OR replacement_password_hash IS NULL OR length(btrim(replacement_password_hash))=0 OR attempt_id IS NULL OR length(btrim(attempt_id))=0 OR receipt_digest IS NULL OR length(btrim(receipt_digest))=0 OR approval_reference IS NULL OR length(btrim(approval_reference))=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF attempt_id !~ '^[A-Za-z0-9_-]{16,128}$' OR receipt_digest !~ '^[a-f0-9]{64}$' OR length(approval_reference)=0 OR replacement_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 SELECT * INTO target FROM public."User" WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR target.role NOT IN ('SUPER_USER','ADMIN') OR target."instituteId"<>institute_id OR NOT EXISTS(SELECT 1 FROM public."Institute" WHERE id=institute_id AND code IN ('ics','ibe','ite')) THEN RAISE EXCEPTION 'OPERATOR_TARGET_DENIED'; END IF;
 SELECT * INTO prior FROM public."AuditLog" WHERE action LIKE 'OPERATOR\_%' ESCAPE '\' AND metadata::jsonb->>'attemptId'=attempt_id;
 IF FOUND THEN
   IF prior."targetId"<>target_id OR prior.action<>'OPERATOR_HANDOFF_COMPLETE' OR prior.metadata::jsonb->>'receiptDigest'<>receipt_digest OR prior.metadata::jsonb->>'instituteId'<>institute_id OR prior.metadata::jsonb->>'approvalReference'<>approval_reference THEN RAISE EXCEPTION 'ATTEMPT_CONFLICT'; END IF;
   RETURN prior.id; -- Reconciliation only: no replay, no password replacement or activation.
 END IF;
 IF target."isActive" OR target.password<>expected_password_hash OR replacement_password_hash=expected_password_hash OR target."credentialProvisioningState"='COMPLETE' THEN RAISE EXCEPTION 'OPERATOR_STATE_CONFLICT'; END IF;
 UPDATE public."User" SET password=replacement_password_hash,"credentialProvisioningState"='COMPLETE' WHERE id=target_id;
 DELETE FROM public."Session" WHERE "userId"=target_id;
 UPDATE public."PasswordResetOtp" SET "isUsed"=true WHERE "userId"=target_id AND NOT "isUsed";
 audit_id := 'operator_' || gen_random_uuid()::text;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata) VALUES(audit_id,target_id,target_id,'OPERATOR_HANDOFF_COMPLETE',
   jsonb_build_object('attemptId',attempt_id,'receiptDigest',receipt_digest,'approvalReference',approval_reference,'instituteId',institute_id,'beforeActive',false,'afterActive',false)::text);
 RETURN audit_id;
END $$;
CREATE OR REPLACE FUNCTION super_user_security.contain_account(target_id text, institute_id text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,super_user_security AS $$
DECLARE target public."User"; audit_id text; prior public."AuditLog";
BEGIN
 IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_DENIED' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL OR length(btrim(target_id))=0 OR institute_id IS NULL OR length(btrim(institute_id))=0 OR attempt_id IS NULL OR length(btrim(attempt_id))=0 OR receipt_digest IS NULL OR length(btrim(receipt_digest))=0 OR approval_reference IS NULL OR length(btrim(approval_reference))=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF attempt_id !~ '^[A-Za-z0-9_-]{16,128}$' OR receipt_digest !~ '^[a-f0-9]{64}$' OR length(approval_reference)=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 SELECT * INTO target FROM public."User" WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR target.role NOT IN ('SUPER_USER','ADMIN') OR target."instituteId"<>institute_id THEN RAISE EXCEPTION 'OPERATOR_TARGET_DENIED'; END IF;
 SELECT * INTO prior FROM public."AuditLog" WHERE action LIKE 'OPERATOR\_%' ESCAPE '\' AND metadata::jsonb->>'attemptId'=attempt_id;
 IF FOUND THEN
   IF prior.action<>'OPERATOR_CONTAINMENT' OR prior."targetId"<>target_id OR prior.metadata::jsonb->>'receiptDigest'<>receipt_digest OR prior.metadata::jsonb->>'instituteId'<>institute_id OR prior.metadata::jsonb->>'approvalReference'<>approval_reference THEN RAISE EXCEPTION 'ATTEMPT_CONFLICT'; END IF;
   RETURN prior.id;
 END IF;
 UPDATE public."User" SET "isActive"=false,"credentialProvisioningState"='PENDING_HANDOFF' WHERE id=target_id;
 DELETE FROM public."Session" WHERE "userId"=target_id;
 UPDATE public."PasswordResetOtp" SET "isUsed"=true WHERE "userId"=target_id AND NOT "isUsed";
 audit_id:='operator_'||gen_random_uuid()::text;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata) VALUES(audit_id,target_id,target_id,'OPERATOR_CONTAINMENT',jsonb_build_object('attemptId',attempt_id,'receiptDigest',receipt_digest,'approvalReference',approval_reference,'instituteId',institute_id,'beforeActive',target."isActive",'afterActive',false)::text);
 RETURN audit_id;
END $$;
CREATE OR REPLACE FUNCTION super_user_security.map_legacy_admin(target_id text, institute_id text, expected_password_hash text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,super_user_security AS $$
BEGIN RAISE EXCEPTION 'RETIRED_ROLE_MAPPING_DISABLED' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION super_user_security.set_ics_faculty(
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
 AND s."expiresAt">clock_timestamp() AND u.role='ADMIN' AND u."isActive"
 AND (u."credentialProvisioningState" IS NULL OR u."credentialProvisioningState"='COMPLETE') AND i.code='ics';
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
ALTER TABLE public."User" DROP CONSTRAINT privileged_admission_state;
ALTER TABLE public."User" ADD CONSTRAINT privileged_admission_state CHECK
 (upper(role)<>'INSTITUTE_ADMIN' AND
 (upper(role)<>'SUPER_USER' OR NOT "isActive" OR "credentialProvisioningState" IS NOT DISTINCT FROM 'COMPLETE'::public."CredentialProvisioningState") AND
 (upper(role)<>'ADMIN' OR NOT "isActive" OR "credentialProvisioningState" IS NULL OR "credentialProvisioningState"='COMPLETE'));
COMMIT;
