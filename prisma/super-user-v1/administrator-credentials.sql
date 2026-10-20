-- Bounded successor: Super Users may reset existing Administrator credentials.
-- Direct password writes, provisioning, role changes and institute transfers stay denied.
BEGIN;
SET LOCAL search_path=pg_catalog,public;

CREATE OR REPLACE FUNCTION super_user_security.guard_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,super_user_security AS $guard$
DECLARE new_priv boolean := upper(NEW.role) IN ('SUPER_USER','ADMIN'); old_priv boolean := false; credential_permit boolean := false;
BEGIN
 IF TG_OP<>'DELETE' AND upper(NEW.role)='INSTITUTE_ADMIN' THEN RAISE EXCEPTION 'RETIRED_ROLE_DENIED' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN
   IF upper(OLD.role) IN ('SUPER_USER','ADMIN') THEN RAISE EXCEPTION 'PRIVILEGED_DELETE_DENIED' USING ERRCODE='42501'; END IF;
   RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' THEN old_priv := upper(OLD.role) IN ('SUPER_USER','ADMIN'); END IF;
 IF super_user_security.operator_qualified() THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' AND NEW."credentialProvisioningState"='COMPLETE' THEN RAISE EXCEPTION 'PROVISIONING_WRITER_DENIED' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' AND new_priv THEN
   IF NOT super_user_security.application_boundary_qualified() OR NEW.role<>'ADMIN' OR NEW."isActive" OR NEW."credentialProvisioningState" IS DISTINCT FROM 'PENDING_HANDOFF'::public."CredentialProvisioningState" OR NEW.permissions<>'[]' THEN
     RAISE EXCEPTION 'PRIVILEGED_WRITER_DENIED' USING ERRCODE='42501';
   END IF;
 ELSIF TG_OP='UPDATE' THEN
   IF NEW."credentialProvisioningState" IS DISTINCT FROM OLD."credentialProvisioningState" THEN RAISE EXCEPTION 'PROVISIONING_WRITER_DENIED' USING ERRCODE='42501'; END IF;
   IF OLD.role='ADMIN' AND NEW.password IS DISTINCT FROM OLD.password AND (to_jsonb(NEW)-'password')=(to_jsonb(OLD)-'password') THEN
     DELETE FROM super_user_security.academic_assignment_permits
     WHERE backend=pg_backend_pid() AND transaction_id=txid_current() AND table_name='User' AND operation='UPDATE'
       AND program_id=OLD."instituteId" AND user_id=OLD.id RETURNING true INTO credential_permit;
   END IF;
   IF new_priv<>old_priv OR old_priv AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.password IS DISTINCT FROM OLD.password AND NOT coalesce(credential_permit,false) OR NEW."instituteId" IS DISTINCT FROM OLD."instituteId" OR NEW.permissions IS DISTINCT FROM OLD.permissions) THEN
     RAISE EXCEPTION 'PRIVILEGED_WRITER_DENIED' USING ERRCODE='42501';
   END IF;
   IF old_priv AND (upper(OLD.role)='SUPER_USER' AND NEW."isActive" IS DISTINCT FROM OLD."isActive" OR NOT super_user_security.application_boundary_qualified()) THEN RAISE EXCEPTION 'PRIVILEGED_STATUS_DENIED' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $guard$;

CREATE OR REPLACE FUNCTION super_user_security.reset_administrator_password(
 session_id text, expected_token_hash text, target_user text, selected_institute text, replacement_hash text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $reset$
DECLARE actor_id text;
BEGIN
 IF session_id IS NULL OR expected_token_hash IS NULL OR target_user IS NULL OR selected_institute IS NULL OR replacement_hash IS NULL
 OR replacement_hash !~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$' THEN RAISE EXCEPTION 'INVALID_CREDENTIAL_REQUEST' USING ERRCODE='22023'; END IF;
 IF NOT super_user_security.application_boundary_qualified() OR has_table_privilege(session_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'UNQUALIFIED_APPLICATION' USING ERRCODE='42501'; END IF;
 SELECT "userId" INTO actor_id FROM public."Session" WHERE id=session_id;
 PERFORM id FROM public."User" WHERE id IN (actor_id,target_user) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public."Session" s JOIN public."User" u ON u.id=s."userId"
   WHERE s.id=session_id AND s."tokenHash"=expected_token_hash AND s."userId"=actor_id AND s."expiresAt">clock_timestamp()
     AND u.role='SUPER_USER' AND u."isActive" AND u."credentialProvisioningState"='COMPLETE') THEN RAISE EXCEPTION 'SUPER_USER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF target_user=actor_id OR NOT EXISTS(SELECT 1 FROM public."User" u JOIN public."Institute" i ON i.id=u."instituteId"
   WHERE u.id=target_user AND u.role='ADMIN' AND u."instituteId"=selected_institute AND i.code IN ('ics','ibe','ite')
     AND (u."credentialProvisioningState" IS NULL OR u."credentialProvisioningState"='COMPLETE')) THEN RAISE EXCEPTION 'ADMINISTRATOR_TARGET_REQUIRED' USING ERRCODE='42501'; END IF;

 -- Consumed by guard_user for exactly this backend, transaction, account and statement.
 INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),'User','UPDATE',selected_institute,target_user);
 UPDATE public."User" SET password=replacement_hash WHERE id=target_user;
 DELETE FROM super_user_security.academic_assignment_permits WHERE backend=pg_backend_pid() AND transaction_id=txid_current() AND table_name='User';
 DELETE FROM public."Session" WHERE "userId"=target_user;
 UPDATE public."PasswordResetOtp" SET "isUsed"=true WHERE "userId"=target_user AND NOT "isUsed";
 INSERT INTO public."AuditLog"(id,"adminId","targetId",action,metadata)
 VALUES(gen_random_uuid()::text,actor_id,target_user,'ADMIN_RESET_PASSWORD',jsonb_build_object(
   'instituteId',selected_institute,'sessionReferenceSHA256',encode(sha256(convert_to(session_id,'UTF8')),'hex'),
   'correlationId',gen_random_uuid()::text,'result','SUCCESS')::text);
END $reset$;
REVOKE ALL ON FUNCTION super_user_security.reset_administrator_password(text,text,text,text,text) FROM PUBLIC;
DO $grants$
DECLARE runtime_name name;
BEGIN
 FOR runtime_name IN SELECT principal FROM super_user_security.writer_bindings WHERE kind='APPLICATION' AND enabled LOOP
   EXECUTE format('GRANT EXECUTE ON FUNCTION super_user_security.reset_administrator_password(text,text,text,text,text) TO %I',runtime_name);
 END LOOP;
END $grants$;
COMMIT;
