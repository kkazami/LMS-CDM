-- Successor guard prefix. No COMPLETE backfill, account mapping, or principal provisioning.
BEGIN;
SET LOCAL search_path = pg_catalog, public;
-- Preserve unauthenticated pre-guard history and stop for reconciliation.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public."AuditLog" WHERE upper(action) LIKE 'OPERATOR\_%' ESCAPE '\') THEN RAISE EXCEPTION 'AMBIGUOUS_PRE_GUARD_OPERATOR_HISTORY'; END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public."User"'::regclass AND attname='credentialProvisioningState' AND atttypid='public."CredentialProvisioningState"'::regtype AND NOT attisdropped) THEN RAISE EXCEPTION 'EXPECTED_EXISTING_CREDENTIAL_COLUMN_REQUIRED'; END IF; END $$;

INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata)
 SELECT 'migration_'||gen_random_uuid()::text,id,id,'MIGRATION_PRIVILEGED_CONTAINMENT',
   jsonb_build_object('databasePrincipal',session_user,'anchorKind','NON_AUTHENTICATED_USER_FK_ANCHOR','beforeActive',"isActive",'afterActive',false)::text
 FROM public."User" WHERE upper(role) IN ('SUPER_USER','INSTITUTE_ADMIN');
UPDATE public."User" SET "isActive" = false WHERE upper(role) IN ('SUPER_USER','INSTITUTE_ADMIN');
DELETE FROM public."Session" s USING public."User" u WHERE s."userId"=u.id AND upper(u.role) IN ('SUPER_USER','INSTITUTE_ADMIN');
UPDATE public."PasswordResetOtp" r SET "isUsed"=true FROM public."User" u WHERE r."userId"=u.id AND upper(u.role) IN ('SUPER_USER','INSTITUTE_ADMIN') AND NOT r."isUsed";
ALTER TABLE public."User" ADD CONSTRAINT privileged_admission_state CHECK
  (upper(role) NOT IN ('SUPER_USER','INSTITUTE_ADMIN') OR NOT "isActive" OR "credentialProvisioningState" = 'COMPLETE' AND "credentialProvisioningState" IS NOT NULL) NOT VALID;
CREATE SCHEMA super_user_security;
REVOKE ALL ON SCHEMA super_user_security FROM PUBLIC;
CREATE TABLE super_user_security.writer_bindings (
  principal name PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('APPLICATION','OPERATOR')),
  enabled boolean NOT NULL DEFAULT false,
  qualification_reference text NOT NULL CHECK (length(qualification_reference) > 0)
);
REVOKE ALL ON super_user_security.writer_bindings FROM PUBLIC;

CREATE FUNCTION super_user_security.application_boundary_qualified() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
  SELECT EXISTS (SELECT 1 FROM super_user_security.writer_bindings b JOIN pg_catalog.pg_roles r ON r.rolname = b.principal
    WHERE b.principal = session_user AND b.kind = 'APPLICATION' AND b.enabled
      AND NOT r.rolsuper AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolbypassrls
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member = r.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relowner=r.oid AND n.nspname IN ('public','super_user_security'))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspowner=r.oid AND n.nspname IN ('public','super_user_security'))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_database d WHERE d.datname=current_database() AND d.datdba=r.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE p.proowner=r.oid AND n.nspname IN ('public','super_user_security'))
      AND NOT pg_catalog.has_schema_privilege(r.oid,'public','CREATE')
      AND NOT pg_catalog.has_schema_privilege(r.oid,'super_user_security','CREATE')
      AND NOT pg_catalog.has_table_privilege(r.oid,'super_user_security.writer_bindings','INSERT,UPDATE,DELETE,TRUNCATE')
      AND NOT pg_catalog.has_table_privilege(r.oid,'public."AuditLog"','TRUNCATE')
      AND (SELECT count(*) FROM pg_catalog.pg_trigger t WHERE t.tgname IN ('super_user_guard','operator_audit_guard','privileged_session_guard') AND t.tgenabled='A' AND NOT t.tgisinternal)=3
      AND EXISTS (SELECT 1 FROM pg_catalog.pg_constraint c WHERE c.conname='privileged_admission_state' AND c.conrelid='public."User"'::regclass AND c.convalidated));
$$;
REVOKE ALL ON FUNCTION super_user_security.application_boundary_qualified() FROM PUBLIC;

CREATE FUNCTION super_user_security.operator_qualified() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
 SELECT EXISTS (SELECT 1 FROM super_user_security.writer_bindings b JOIN pg_catalog.pg_roles r ON r.rolname=b.principal
   WHERE b.principal=session_user AND b.kind='OPERATOR' AND b.enabled AND NOT r.rolsuper AND NOT r.rolcreaterole
     AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolbypassrls
     AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid)
     AND NOT pg_catalog.has_table_privilege(r.oid,'public."User"','INSERT,UPDATE,DELETE,TRUNCATE')
     AND NOT pg_catalog.has_table_privilege(r.oid,'public."AuditLog"','INSERT,UPDATE,DELETE,TRUNCATE')
     AND NOT pg_catalog.has_schema_privilege(r.oid,'public','CREATE')
     AND NOT pg_catalog.has_schema_privilege(r.oid,'super_user_security','CREATE'));
$$;
REVOKE ALL ON FUNCTION super_user_security.operator_qualified() FROM PUBLIC;

CREATE FUNCTION super_user_security.guard_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
DECLARE new_priv boolean := upper(NEW.role) IN ('SUPER_USER','INSTITUTE_ADMIN'); old_priv boolean := false;
BEGIN
 IF TG_OP='DELETE' THEN
   IF upper(OLD.role) IN ('SUPER_USER','INSTITUTE_ADMIN') THEN RAISE EXCEPTION 'PRIVILEGED_DELETE_DENIED' USING ERRCODE='42501'; END IF;
   RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' THEN old_priv := upper(OLD.role) IN ('SUPER_USER','INSTITUTE_ADMIN'); END IF;
 IF super_user_security.operator_qualified() THEN
   RETURN NEW; -- Operator has no table DML grants; only bounded functions below.
 END IF;
 IF TG_OP='INSERT' AND NEW."credentialProvisioningState"='COMPLETE' THEN RAISE EXCEPTION 'PROVISIONING_WRITER_DENIED' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' AND new_priv THEN
   IF NOT super_user_security.application_boundary_qualified() OR NEW.role <> 'INSTITUTE_ADMIN' OR NEW."isActive" OR NEW."credentialProvisioningState" IS DISTINCT FROM 'PENDING_HANDOFF'::public."CredentialProvisioningState" OR NEW.permissions <> '[]' THEN
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
REVOKE ALL ON FUNCTION super_user_security.guard_user() FROM PUBLIC;
CREATE TRIGGER super_user_guard BEFORE INSERT OR UPDATE OR DELETE ON public."User" FOR EACH ROW EXECUTE FUNCTION super_user_security.guard_user();
ALTER TABLE public."User" ENABLE ALWAYS TRIGGER super_user_guard;

CREATE FUNCTION super_user_security.guard_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'AUDIT_HISTORY_IMMUTABLE' USING ERRCODE='42501'; END IF;
 IF upper(NEW.action) LIKE 'OPERATOR\_%' ESCAPE '\' THEN
   IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_AUDIT_DENIED' USING ERRCODE='42501'; END IF;
   NEW.metadata := (NEW.metadata::jsonb || jsonb_build_object('databasePrincipal',session_user,'anchorKind','NON_AUTHENTICATED_USER_FK_ANCHOR'))::text;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION super_user_security.guard_audit() FROM PUBLIC;
CREATE TRIGGER operator_audit_guard BEFORE INSERT OR UPDATE OR DELETE ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION super_user_security.guard_audit();
ALTER TABLE public."AuditLog" ENABLE ALWAYS TRIGGER operator_audit_guard;
CREATE UNIQUE INDEX operator_attempt_unique ON public."AuditLog" ((metadata::jsonb->>'attemptId')) WHERE action LIKE 'OPERATOR\_%' ESCAPE '\';

CREATE FUNCTION super_user_security.guard_session() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
DECLARE target public."User";
BEGIN
 SELECT * INTO target FROM public."User" WHERE id=NEW."userId" FOR UPDATE;
 IF NOT FOUND OR NOT target."isActive" OR upper(target.role) NOT IN ('SUPER_USER','INSTITUTE_ADMIN','ADMIN','INSTRUCTOR','PROFESSOR','TEACHER','STUDENT') THEN RAISE EXCEPTION 'SESSION_ADMISSION_DENIED' USING ERRCODE='42501'; END IF;
 IF upper(target.role) IN ('SUPER_USER','INSTITUTE_ADMIN') AND (target."credentialProvisioningState" IS DISTINCT FROM 'COMPLETE'::public."CredentialProvisioningState" OR NOT super_user_security.application_boundary_qualified()) THEN RAISE EXCEPTION 'SESSION_ADMISSION_DENIED' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION super_user_security.guard_session() FROM PUBLIC;
CREATE TRIGGER privileged_session_guard BEFORE INSERT OR UPDATE ON public."Session" FOR EACH ROW EXECUTE FUNCTION super_user_security.guard_session();
ALTER TABLE public."Session" ENABLE ALWAYS TRIGGER privileged_session_guard;

-- Completion always preserves status. New IA activation uses the separate dedicated
-- status operation after COMPLETE; this function never removes a suspension.
CREATE FUNCTION super_user_security.complete_handoff(target_id text, institute_id text, expected_password_hash text,
  replacement_password_hash text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, super_user_security AS $$
DECLARE target public."User"; prior public."AuditLog"; audit_id text;
BEGIN
 IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_DENIED' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL OR length(btrim(target_id))=0 OR institute_id IS NULL OR length(btrim(institute_id))=0 OR expected_password_hash IS NULL OR length(btrim(expected_password_hash))=0 OR replacement_password_hash IS NULL OR length(btrim(replacement_password_hash))=0 OR attempt_id IS NULL OR length(btrim(attempt_id))=0 OR receipt_digest IS NULL OR length(btrim(receipt_digest))=0 OR approval_reference IS NULL OR length(btrim(approval_reference))=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF attempt_id !~ '^[A-Za-z0-9_-]{16,128}$' OR receipt_digest !~ '^[a-f0-9]{64}$' OR length(approval_reference)=0 OR replacement_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 SELECT * INTO target FROM public."User" WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR target.role NOT IN ('SUPER_USER','INSTITUTE_ADMIN') OR target."instituteId"<>institute_id OR NOT EXISTS(SELECT 1 FROM public."Institute" WHERE id=institute_id AND code IN ('ics','ibe','ite')) THEN RAISE EXCEPTION 'OPERATOR_TARGET_DENIED'; END IF;
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
REVOKE ALL ON FUNCTION super_user_security.complete_handoff(text,text,text,text,text,text,text) FROM PUBLIC;
CREATE FUNCTION super_user_security.map_legacy_admin(target_id text, institute_id text, expected_password_hash text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,super_user_security AS $$
DECLARE target public."User"; audit_id text; prior public."AuditLog";
BEGIN
 IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_DENIED' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL OR length(btrim(target_id))=0 OR institute_id IS NULL OR length(btrim(institute_id))=0 OR expected_password_hash IS NULL OR length(btrim(expected_password_hash))=0 OR attempt_id IS NULL OR length(btrim(attempt_id))=0 OR receipt_digest IS NULL OR length(btrim(receipt_digest))=0 OR approval_reference IS NULL OR length(btrim(approval_reference))=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF attempt_id !~ '^[A-Za-z0-9_-]{16,128}$' OR receipt_digest !~ '^[a-f0-9]{64}$' OR length(approval_reference)=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 SELECT * INTO target FROM public."User" WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR target."instituteId"<>institute_id OR NOT EXISTS(SELECT 1 FROM public."Institute" WHERE id=institute_id AND code IN ('ics','ibe','ite')) THEN RAISE EXCEPTION 'OPERATOR_TARGET_DENIED'; END IF;
 SELECT * INTO prior FROM public."AuditLog" WHERE action LIKE 'OPERATOR\_%' ESCAPE '\' AND metadata::jsonb->>'attemptId'=attempt_id;
 IF FOUND THEN
   IF prior.action<>'OPERATOR_ADMIN_MAPPING' OR prior."targetId"<>target_id OR prior.metadata::jsonb->>'receiptDigest'<>receipt_digest OR prior.metadata::jsonb->>'instituteId'<>institute_id OR prior.metadata::jsonb->>'approvalReference'<>approval_reference THEN RAISE EXCEPTION 'ATTEMPT_CONFLICT'; END IF;
   RETURN prior.id;
 END IF;
 IF target.role<>'ADMIN' OR target.password<>expected_password_hash THEN RAISE EXCEPTION 'OPERATOR_STATE_CONFLICT'; END IF;
 UPDATE public."User" SET role='INSTITUTE_ADMIN',permissions='[]',"isActive"=false,"credentialProvisioningState"='PENDING_HANDOFF' WHERE id=target_id;
 DELETE FROM public."Session" WHERE "userId"=target_id;
 UPDATE public."PasswordResetOtp" SET "isUsed"=true WHERE "userId"=target_id AND NOT "isUsed";
 audit_id:='operator_'||gen_random_uuid()::text;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata) VALUES(audit_id,target_id,target_id,'OPERATOR_ADMIN_MAPPING',jsonb_build_object('attemptId',attempt_id,'receiptDigest',receipt_digest,'approvalReference',approval_reference,'instituteId',institute_id,'beforeActive',target."isActive",'afterActive',false)::text);
 RETURN audit_id;
END $$;
REVOKE ALL ON FUNCTION super_user_security.map_legacy_admin(text,text,text,text,text,text) FROM PUBLIC;

CREATE FUNCTION super_user_security.contain_account(target_id text, institute_id text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,super_user_security AS $$
DECLARE target public."User"; audit_id text; prior public."AuditLog";
BEGIN
 IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_DENIED' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL OR length(btrim(target_id))=0 OR institute_id IS NULL OR length(btrim(institute_id))=0 OR attempt_id IS NULL OR length(btrim(attempt_id))=0 OR receipt_digest IS NULL OR length(btrim(receipt_digest))=0 OR approval_reference IS NULL OR length(btrim(approval_reference))=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF attempt_id !~ '^[A-Za-z0-9_-]{16,128}$' OR receipt_digest !~ '^[a-f0-9]{64}$' OR length(approval_reference)=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 SELECT * INTO target FROM public."User" WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR target.role NOT IN ('SUPER_USER','INSTITUTE_ADMIN') OR target."instituteId"<>institute_id THEN RAISE EXCEPTION 'OPERATOR_TARGET_DENIED'; END IF;
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
REVOKE ALL ON FUNCTION super_user_security.contain_account(text,text,text,text,text) FROM PUBLIC;

CREATE FUNCTION super_user_security.bootstrap_super_user(identifier text, holder_name text, holder_email text, institute_id text, initial_password_hash text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,super_user_security AS $$
DECLARE target_id text;
BEGIN
 IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_DENIED' USING ERRCODE='42501'; END IF;
 IF identifier IS NULL OR length(btrim(identifier))=0 OR holder_name IS NULL OR length(btrim(holder_name))=0 OR holder_email IS NULL OR length(btrim(holder_email))=0 OR institute_id IS NULL OR length(btrim(institute_id))=0 OR initial_password_hash IS NULL OR length(btrim(initial_password_hash))=0 OR attempt_id IS NULL OR length(btrim(attempt_id))=0 OR receipt_digest IS NULL OR length(btrim(receipt_digest))=0 OR approval_reference IS NULL OR length(btrim(approval_reference))=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF identifier NOT IN ('cdm_super_user_01','cdm_super_user_02') OR attempt_id !~ '^[A-Za-z0-9_-]{16,128}$' OR receipt_digest !~ '^[a-f0-9]{64}$' OR length(approval_reference)=0 OR initial_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."Institute" WHERE id=institute_id AND code IN ('ics','ibe','ite')) THEN RAISE EXCEPTION 'OPERATOR_TARGET_DENIED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('super_user_bootstrap',0));
 IF EXISTS(SELECT 1 FROM public."User" WHERE "uniqueId"=identifier OR email=lower(holder_email)) THEN RAISE EXCEPTION 'BOOTSTRAP_RECONCILIATION_REQUIRED'; END IF;
 target_id:='bootstrap_'||gen_random_uuid()::text;
 INSERT INTO public."User"(id,name,email,password,"uniqueId",role,"isActive",permissions,"instituteId","credentialProvisioningState") VALUES(target_id,holder_name,lower(holder_email),initial_password_hash,identifier,'SUPER_USER',false,'[]',institute_id,'PENDING_HANDOFF');
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata) VALUES('operator_'||gen_random_uuid()::text,target_id,target_id,'OPERATOR_BOOTSTRAP_PENDING',jsonb_build_object('attemptId',attempt_id,'receiptDigest',receipt_digest,'approvalReference',approval_reference,'instituteId',institute_id,'identifier',identifier)::text);
 RETURN target_id;
END $$;
REVOKE ALL ON FUNCTION super_user_security.bootstrap_super_user(text,text,text,text,text,text,text,text) FROM PUBLIC;

-- Separate first-activation permission. A protected genuine bootstrap history is
-- required; mapping, recovery, caller origin flags and arbitrary audit text cannot substitute.
CREATE FUNCTION super_user_security.activate_new_bootstrap(target_id text, institute_id text, creation_attempt_id text, attempt_id text, receipt_digest text, approval_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,super_user_security AS $$
DECLARE target public."User"; creation public."AuditLog"; prior public."AuditLog"; audit_id text;
BEGIN
 IF NOT super_user_security.operator_qualified() THEN RAISE EXCEPTION 'OPERATOR_DENIED' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL OR length(btrim(target_id))=0 OR institute_id IS NULL OR length(btrim(institute_id))=0 OR creation_attempt_id IS NULL OR length(btrim(creation_attempt_id))=0 OR attempt_id IS NULL OR length(btrim(attempt_id))=0 OR receipt_digest IS NULL OR length(btrim(receipt_digest))=0 OR approval_reference IS NULL OR length(btrim(approval_reference))=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 IF attempt_id !~ '^[A-Za-z0-9_-]{16,128}$' OR receipt_digest !~ '^[a-f0-9]{64}$' OR length(approval_reference)=0 THEN RAISE EXCEPTION 'INVALID_OPERATOR_BINDING'; END IF;
 SELECT * INTO target FROM public."User" WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR target.role<>'SUPER_USER' OR target."instituteId"<>institute_id OR target."credentialProvisioningState" IS DISTINCT FROM 'COMPLETE'::public."CredentialProvisioningState" THEN RAISE EXCEPTION 'OPERATOR_TARGET_DENIED'; END IF;
 SELECT * INTO prior FROM public."AuditLog" WHERE action LIKE 'OPERATOR\_%' ESCAPE '\' AND metadata::jsonb->>'attemptId'=attempt_id;
 IF FOUND THEN
   IF prior.action<>'OPERATOR_INITIAL_ACTIVATION' OR prior."targetId"<>target_id OR prior.metadata::jsonb->>'receiptDigest'<>receipt_digest OR prior.metadata::jsonb->>'approvalReference'<>approval_reference THEN RAISE EXCEPTION 'ATTEMPT_CONFLICT'; END IF;
   RETURN prior.id; -- Later containment is never undone by a replay.
 END IF;
 SELECT * INTO creation FROM public."AuditLog" WHERE "targetId"=target_id AND action='OPERATOR_BOOTSTRAP_PENDING' AND metadata::jsonb->>'attemptId'=creation_attempt_id AND metadata::jsonb->>'instituteId'=institute_id;
 IF NOT FOUND OR target."isActive" OR EXISTS(SELECT 1 FROM public."AuditLog" WHERE "targetId"=target_id AND action IN ('OPERATOR_INITIAL_ACTIVATION','OPERATOR_CONTAINMENT','OPERATOR_ADMIN_MAPPING','INSTITUTE_ADMIN_SUSPEND')) THEN RAISE EXCEPTION 'INITIAL_ACTIVATION_DENIED'; END IF;
 UPDATE public."User" SET "isActive"=true WHERE id=target_id;
 audit_id:='operator_'||gen_random_uuid()::text;
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata) VALUES(audit_id,target_id,target_id,'OPERATOR_INITIAL_ACTIVATION',jsonb_build_object('attemptId',attempt_id,'receiptDigest',receipt_digest,'approvalReference',approval_reference,'creationAttemptId',creation_attempt_id,'instituteId',institute_id,'beforeActive',false,'afterActive',true)::text);
 RETURN audit_id;
END $$;
REVOKE ALL ON FUNCTION super_user_security.activate_new_bootstrap(text,text,text,text,text,text) FROM PUBLIC;
COMMIT;
