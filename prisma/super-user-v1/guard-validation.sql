BEGIN;
SET LOCAL search_path=pg_catalog,public;
ALTER TABLE public."User" VALIDATE CONSTRAINT privileged_admission_state;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public."User" WHERE upper(role) IN ('SUPER_USER','INSTITUTE_ADMIN') AND "isActive" AND "credentialProvisioningState" IS DISTINCT FROM 'COMPLETE'::public."CredentialProvisioningState") THEN RAISE EXCEPTION 'PRIVILEGED_STATE_CONFLICT'; END IF;
END $$;
COMMIT;
