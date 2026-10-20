"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { InstituteTheme } from "@/lib/theme";
import {
  fieldClass,
  secondaryClass,
  rosterRequest,
  type TermOption,
  type BatchView,
} from "./roster-client";

type Kind = "STUDENTS" | "COURSES" | "ENROLLMENTS";
const resultLabels: Record<string, string> = { NEW: "New", EXISTING: "Already exists", ERROR: "Needs fixing", CREATED: "Added", UPDATED: "Updated", SKIPPED: "Skipped" };
const fieldLabels: Record<string, string> = { student_Id: "Student ID", first_name: "First name", last_name: "Last name", email: "Email", program: "Program", section: "Section", courseCode: "Class code", subject: "Subject", title: "Title", room: "Room", description: "Description", instructorEmail: "Instructor email" };
export default function ImportWizard({
  type,
  instituteCode,
  theme,
  onComplete,
}: {
  type: Kind;
  instituteCode: string;
  theme: InstituteTheme;
  onComplete?: () => void;
}) {
  const [csv, setCsv] = useState(""),
    [terms, setTerms] = useState<TermOption[]>([]),
    [termId, setTerm] = useState("");
  const [batch, setBatch] = useState<BatchView | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [overrides, setOverrides] = useState<string[]>([]);
  const [policy, setPolicy] = useState("SKIP"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("ALL");
  const storageKey = "roster-import:" + instituteCode + ":" + type;
  function adopt(next: BatchView) {
    setBatch(next);
    setSelected(
      next.rows.filter((r) => r.proposedAction !== "ERROR").map((r) => r.id),
    );
    sessionStorage.setItem(storageKey, next.id);
  }
  useEffect(() => {
    let live = true;
    rosterRequest<{ terms: TermOption[] }>("/api/admin/terms")
      .then((data) => {
        if (live) {
          setTerms(data.terms.filter((t) => t.isActive));
          setTerm(data.terms.find((t) => t.isCurrent)?.id ?? "");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    const id = sessionStorage.getItem(storageKey);
    if (id)
      rosterRequest<BatchView>("/api/admin/imports/" + id)
        .then((next) => {
          if (live) {
            setBatch(next);
            setSelected(
              next.rows
                .filter((r) => r.selected || r.proposedAction !== "ERROR")
                .map((r) => r.id),
            );
            setPolicy(next.policy);
          }
        })
        .catch(() => sessionStorage.removeItem(storageKey));
    return () => {
      live = false;
    };
  }, [storageKey]);
  async function preview(matches = false) {
    setBusy(true);
    setError("");
    try {
      const next = await rosterRequest<BatchView>(
        matches
          ? "/api/admin/enrollments/preview-matches"
          : "/api/admin/imports/preview",
        matches
          ? { termId }
          : { type, csv, ...(type === "STUDENTS" ? {} : { termId }) },
      );
      adopt(next);
      setOverrides([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!batch) return;
    setBusy(true);
    setError("");
    try {
      let next = await rosterRequest<BatchView>(
        "/api/admin/imports/" + batch.id + "/commit",
        { policy, rowIds: selected, overrideRejectedIds: overrides },
      );
      setBatch(next);
      while (next.status === "PROCESSING") {
        next = await rosterRequest<BatchView>(
          "/api/admin/imports/" + batch.id + "/commit",
          {},
        );
        setBatch(next);
      }
      onComplete?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const toggle = (
    id: string,
    list: string[],
    setter: (value: string[]) => void,
  ) => setter(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);
  return (
    <section
      className="space-y-5 text-slate-900 dark:text-slate-100"
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center gap-3">
        <a
          className={secondaryClass}
          href={"/api/admin/imports/templates/" + type}
        >
          Download CSV Template
        </a>
        <Link
          className="text-sm underline underline-offset-4"
          href={"/" + instituteCode + "/admin/onboarding"}
        >
          Students and classes
        </Link>
      </div>
      {!batch ? (
        <>
          {type !== "STUDENTS" && (
            <label className="grid gap-2 text-sm font-semibold">
              Academic term
              <select
                aria-label="Academic term"
                className={fieldClass}
                value={termId}
                onChange={(e) => setTerm(e.target.value)}
              >
                <option value="">Choose an active term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-2 text-sm font-semibold">
            Upload a CSV file (up to 500 rows and 2 MB)
            <input
              className={fieldClass}
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2097152) {
                  setError("This file is too large. Choose a CSV file under 2 MB.");
                  return;
                }
                setCsv(await file.text());
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Or paste CSV
            <textarea
              className={fieldClass + " min-h-36 font-mono"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              spellCheck={false}
            />
          </label>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Review the list before adding it. Rows with errors will not be imported.
            You can send account invitations afterward.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy || !csv || (type !== "STUDENTS" && !termId)}
              className={secondaryClass}
              style={{ borderColor: theme.colors.primary }}
              onClick={() => preview()}
            >
              {busy ? "Checking your list…" : "Review import"}
            </button>
            {type === "ENROLLMENTS" && (
              <button
                className={secondaryClass}
                disabled={busy || !termId}
                onClick={() => preview(true)}
              >
                Match students to classes
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold" role="status">
            {batch.rows.filter((r) => r.proposedAction === "NEW").length} new ·{" "}
            {batch.rows.filter((r) => r.proposedAction === "EXISTING").length}{" "}
            existing ·{" "}
            {
              batch.rows.filter(
                (r) => r.proposedAction === "ERROR" || r.outcome === "ERROR",
              ).length
            }{" "}
            errors
          </p>
          <p className="text-sm">
            {batch.status === "COMPLETED"
              ? "Import complete. " +
                batch.rows.filter((r) => r.outcome === "CREATED").length +
                " created, " +
                batch.rows.filter((r) => r.outcome === "UPDATED").length +
                " updated, " +
                batch.rows.filter((r) => r.outcome === "SKIPPED").length +
                " skipped."
              : batch.status === "PROCESSING"
                ? "Import in progress. Completed rows are saved; resume if interrupted."
                : "Preview expires " +
                  new Date(batch.expiresAt).toLocaleString() +
                  "."}
          </p>
          <div className="flex flex-wrap gap-3">
            {type !== "ENROLLMENTS" && (
              <label className="grid gap-1 text-sm">
                Existing records
                <select
                  disabled={batch.status !== "PREVIEW" || busy}
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  className={fieldClass}
                >
                  <option value="SKIP">Skip</option>
                  <option value="UPDATE">
                    Update existing details
                  </option>
                </select>
              </label>
            )}
            <label className="grid gap-1 text-sm">
              Show rows
              <select
                className={fieldClass}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="ERROR">Errors</option>
                <option value="NEW">New</option>
                <option value="EXISTING">Existing</option>
              </select>
            </label>
            <a
              className={secondaryClass + " self-end"}
              href={"/api/admin/imports/" + batch.id + "/report"}
            >
              Download import results
            </a>
          </div>
          {policy === "UPDATE" && (
            <p className="text-sm">
              Updates replace names and class details, including the instructor and program.
              Blank optional fields remove the saved value. Student IDs, passwords,
              permissions, and past enrollments stay the same.
            </p>
          )}
          <p className="text-sm text-slate-600 sm:hidden dark:text-slate-300">Swipe the table horizontally to review each row.</p>
          <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-white/15">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Import preview and row validation results
              </caption>
              <thead>
                <tr className="border-b dark:border-white/15">
                  <th className="p-3">Import</th>
                  <th className="p-3">Row</th>
                  <th className="p-3">Values</th>
                  <th className="p-3">Result and errors</th>
                </tr>
              </thead>
              <tbody>
                {batch.rows
                  .filter(
                    (r) =>
                      filter === "ALL" ||
                      r.proposedAction === filter ||
                      r.outcome === filter,
                  )
                  .map((row) => (
                    <tr
                      key={row.id}
                      className={
                        "border-b align-top dark:border-white/10 " +
                        (row.proposedAction === "ERROR" ||
                        row.outcome === "ERROR"
                          ? "bg-red-50 dark:bg-red-950/30"
                          : "")
                      }
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={"Select row " + row.rowNumber}
                          disabled={
                            busy ||
                            batch.status !== "PREVIEW" ||
                            row.proposedAction === "ERROR"
                          }
                          checked={selected.includes(row.id)}
                          onChange={() => toggle(row.id, selected, setSelected)}
                        />
                      </td>
                      <td className="p-3 tabular-nums">{row.rowNumber}</td>
                      <td className="min-w-64 p-3">
                        <dl>
                          {Object.entries(row.values).map(([key, value]) => (
                            <div key={key}>
                              <dt className="inline text-slate-500 dark:text-slate-400">
                                {fieldLabels[key] ?? key}:{" "}
                              </dt>
                              <dd className="inline break-words">
                                {value || "—"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                      <td className="min-w-56 p-3">
                        <strong>{resultLabels[row.outcome ?? row.proposedAction] ?? "Not imported"}</strong>
                        {row.previousValues && (
                          <details className="mt-2">
                            <summary>Existing values</summary>
                            <dl>
                              {Object.entries(row.previousValues).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    <dt className="inline">{fieldLabels[key] ?? key}: </dt>
                                    <dd className="inline break-words">
                                      {value || "—"}
                                    </dd>
                                  </div>
                                ),
                              )}
                            </dl>
                          </details>
                        )}
                        {row.issues.map((issue, i) => (
                          <p key={i}>{issue}</p>
                        ))}
                        {row.error && <p>{row.error}</p>}
                        {type === "ENROLLMENTS" &&
                          row.proposedAction === "EXISTING" && (
                            <label className="mt-3 flex gap-2">
                              <input
                                type="checkbox"
                                disabled={batch.status !== "PREVIEW" || busy}
                                checked={overrides.includes(row.id)}
                                onChange={() =>
                                  toggle(row.id, overrides, setOverrides)
                                }
                              />
                              Approve even if previously rejected
                            </label>
                          )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3">
            {batch.status !== "COMPLETED" && (
              <button
                className={secondaryClass}
                disabled={busy || !selected.length}
                onClick={commit}
              >
                {busy
                  ? "Importing…"
                  : batch.status === "PROCESSING"
                    ? "Resume Import"
                    : "Import selected rows"}
              </button>
            )}
            <button
              className={secondaryClass}
              disabled={busy}
              onClick={() => {
                setBatch(null);
                sessionStorage.removeItem(storageKey);
              }}
            >
              Start Another Import
            </button>
            {type === "STUDENTS" && batch.status === "COMPLETED" && (
              <Link
                className={secondaryClass}
                href={"/" + instituteCode + "/admin/onboarding?tab=invitations"}
              >
                Send Invitations
              </Link>
            )}
          </div>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="text-sm font-medium text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}
