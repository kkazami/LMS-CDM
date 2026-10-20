import fs from "node:fs";

/** Owner-only installation; no environment loading or implicit database target. */
export async function installRosterActivation(owner, { manageTransaction = true } = {}) {
  const sql = fs.readFileSync(
    "prisma/super-user-v1/student-program-assignment.sql",
    "utf8",
  );
  const expectedBody = sql
    .split("AS $function$")[1]
    .split("$function$;")[0]
    .trim()
    .replaceAll("\r\n", "\n");
  const existing = (
    await owner.query(
      "SELECT prosrc,pg_get_userbyid(proowner)=current_user AS owned FROM pg_proc WHERE oid=to_regprocedure('super_user_security.set_student_program(text,text,text,text)')",
    )
  ).rows[0];
  if (existing) {
    if (
      !existing.owned ||
      existing.prosrc.trim().replaceAll("\r\n", "\n") !== expectedBody
    )
      throw new Error(
        "Student assignment function differs from the reviewed implementation. Reconcile before installation.",
      );
  }
  if (
    !(
      await owner.query(
        "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('super_user_security.guard_user()') AND pg_get_userbyid(proowner)=current_user) AS owned",
      )
    ).rows[0].owned
  )
    throw new Error("Existing security-boundary owner is required.");
  let committing = false;
  if (manageTransaction) await owner.query("BEGIN");
  try {
    await owner.query(
      "SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'",
    );
    await owner.query(sql.replace(/^\s*BEGIN;/, "").replace(/COMMIT;\s*$/, ""));
    const tables = [
      "AcademicTerm",
      "AccountActivationToken",
      "ImportBatch",
      "ImportRow",
      "EmailJob",
      "EmailSendAttempt",
      "EmailSenderState",
      "RateLimitBucket",
    ];
    const bindings = (
      await owner.query(
        "SELECT principal FROM super_user_security.writer_bindings WHERE kind='APPLICATION' AND enabled",
      )
    ).rows;
    for (const { principal } of bindings) {
      const quoted = '"' + principal.replaceAll('"', '""') + '"';
      for (const table of tables)
        await owner.query(
          'GRANT SELECT,INSERT,UPDATE,DELETE ON public."' +
            table +
            '" TO ' +
            quoted,
        );
    }
    if (manageTransaction) {
      committing = true;
      await owner.query("COMMIT");
    }
    return {
      installed: true,
      studentAssignmentInstalled: true,
      tableGrantsInstalled: true,
    };
  } catch (error) {
    if (committing)
      throw new Error(
        "ROSTER_INSTALL_COMMIT_UNCERTAIN: reconcile installed functions and grants before retrying.",
      );
    if (manageTransaction) await owner.query("ROLLBACK");
    throw error;
  }
}
