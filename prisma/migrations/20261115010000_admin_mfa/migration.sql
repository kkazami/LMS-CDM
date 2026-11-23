-- Apply with the trusted migration principal. Runtime CRUD grants follow the
-- deployment's existing reviewed role policy; no PUBLIC access is introduced.
BEGIN;
CREATE TABLE "AdminMfaFactor" (
  "userId" TEXT PRIMARY KEY,
  "encryptedSecret" TEXT NOT NULL,
  "recoveryHashes" TEXT NOT NULL,
  "lastCounter" BIGINT,
  "version" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminMfaFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "AdminMfaChallenge" (
  "tokenHash" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "identityHash" TEXT NOT NULL,
  "userAgentHash" TEXT NOT NULL,
  "factorVersion" TEXT,
  "encryptedSecret" TEXT,
  "recoveryHashes" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verifiedCounter" BIGINT,
  "recoveryAcknowledgedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminMfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AdminMfaChallenge_userId_idx" ON "AdminMfaChallenge"("userId");
CREATE INDEX "AdminMfaChallenge_expiresAt_idx" ON "AdminMfaChallenge"("expiresAt");
CREATE TABLE "AdminMfaSession" (
  "sessionId" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "factorVersion" TEXT NOT NULL,
  "identityHash" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminMfaSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AdminMfaSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AdminMfaSession_userId_idx" ON "AdminMfaSession"("userId");
REVOKE ALL ON "AdminMfaFactor", "AdminMfaChallenge", "AdminMfaSession" FROM PUBLIC;

-- Also included verbatim in the MFA migration. Current-schema disposable fixtures
-- install this companion because Prisma's schema diff does not emit triggers.
CREATE OR REPLACE FUNCTION public.revoke_admin_mfa_on_identity_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF ROW(OLD.id, OLD.email, OLD.password, OLD.role, OLD."instituteId", OLD."googleSubject", OLD."credentialProvisioningState", OLD."isActive", OLD."activationStatus")
     IS DISTINCT FROM
     ROW(NEW.id, NEW.email, NEW.password, NEW.role, NEW."instituteId", NEW."googleSubject", NEW."credentialProvisioningState", NEW."isActive", NEW."activationStatus") THEN
    DELETE FROM public."AdminMfaChallenge" WHERE "userId" IN (OLD.id, NEW.id);
    DELETE FROM public."AdminMfaSession" WHERE "userId" IN (OLD.id, NEW.id);
    IF upper(OLD.role) IN ('ADMIN', 'SUPER_USER') OR upper(NEW.role) IN ('ADMIN', 'SUPER_USER') THEN
      DELETE FROM public."Session" WHERE "userId" IN (OLD.id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_admin_mfa_on_identity_change() FROM PUBLIC;
DROP TRIGGER IF EXISTS revoke_admin_mfa_identity ON public."User";
CREATE TRIGGER revoke_admin_mfa_identity
AFTER UPDATE OF id, email, password, role, "instituteId", "googleSubject", "credentialProvisioningState", "isActive", "activationStatus"
ON public."User" FOR EACH ROW EXECUTE FUNCTION public.revoke_admin_mfa_on_identity_change();

CREATE OR REPLACE FUNCTION public.revoke_admin_mfa_on_factor_reset()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE next_user text;
BEGIN
  IF TG_OP = 'DELETE' THEN next_user := OLD."userId";
  ELSE
    next_user := NEW."userId";
    IF ROW(OLD."userId", OLD.version, OLD."encryptedSecret") IS NOT DISTINCT FROM ROW(NEW."userId", NEW.version, NEW."encryptedSecret") THEN RETURN NEW; END IF;
  END IF;
  DELETE FROM public."AdminMfaChallenge" WHERE "userId" IN (OLD."userId", next_user);
  DELETE FROM public."Session" WHERE "userId" IN (OLD."userId", next_user);
  DELETE FROM public."AdminMfaSession" WHERE "userId" IN (OLD."userId", next_user);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_admin_mfa_on_factor_reset() FROM PUBLIC;
DROP TRIGGER IF EXISTS revoke_admin_mfa_factor ON public."AdminMfaFactor";
CREATE TRIGGER revoke_admin_mfa_factor
AFTER DELETE OR UPDATE OF "userId", version, "encryptedSecret" ON public."AdminMfaFactor"
FOR EACH ROW EXECUTE FUNCTION public.revoke_admin_mfa_on_factor_reset();
COMMIT;
