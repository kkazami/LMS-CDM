import fs from "node:fs";
import { Client } from "pg";

if (!process.env.ROSTER_DATABASE_URL)
  throw new Error(
    "Set an explicit ROSTER_DATABASE_URL. No default or dotenv database is used.",
  );
const client = new Client({
  connectionString: process.env.ROSTER_DATABASE_URL,
});
await client.connect();
try {
  await client.query("BEGIN READ ONLY");
  const queries = {
    duplicateEmails:
      'SELECT array_agg(id ORDER BY id) AS "accountIds" FROM "User" GROUP BY lower(btrim(email)) HAVING count(*)>1',
    duplicateStudentNumbers: `SELECT array_agg(id ORDER BY id) AS "accountIds" FROM "User" WHERE coalesce(nullif(btrim("studentNumber"),''),CASE WHEN upper(role)='STUDENT' THEN nullif(btrim("uniqueId"),'') END) IS NOT NULL GROUP BY upper(coalesce(nullif(btrim("studentNumber"),''),CASE WHEN upper(role)='STUDENT' THEN nullif(btrim("uniqueId"),'') END)) HAVING count(*)>1`,
    conflictingIdentifiers: `SELECT id AS "accountId" FROM "User" WHERE upper(role)='STUDENT' AND nullif(btrim("studentNumber"),'') IS NOT NULL AND nullif(btrim("uniqueId"),'') IS NOT NULL AND upper(btrim("studentNumber"))<>upper(btrim("uniqueId"))`,
    multipleStudentPrograms: `SELECT "userId" AS "accountId",array_agg("programId" ORDER BY "programId") AS "programIds" FROM "ProgramMembership" WHERE kind='STUDENT' AND "isActive" GROUP BY "userId" HAVING count(*)>1`,
  };
  const report = {
    createdAt: new Date().toISOString(),
    readOnly: true,
    issues: {},
  };
  for (const [key, query] of Object.entries(queries))
    report.issues[key] = (await client.query(query)).rows;
  await client.query("ROLLBACK");
  const output = process.argv[2];
  if (!output) throw new Error("Supply an explicit report output path.");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      reportWritten: true,
      issueGroups: Object.fromEntries(
        Object.entries(report.issues).map(([key, rows]) => [key, rows.length]),
      ),
    }),
  );
} finally {
  await client.end();
}
