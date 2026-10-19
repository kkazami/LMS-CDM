"use client";
import { useEffect, useState } from "react";
import {
  rosterRequest,
  fieldClass,
  secondaryClass,
  type TermOption,
} from "./roster-client";
export default function TermManagement() {
  const [terms, setTerms] = useState<TermOption[]>([]),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [current, setCurrent] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const data = await rosterRequest<{ terms: TermOption[] }>(
      "/api/admin/terms",
    );
    setTerms(data.terms);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function save(term?: TermOption) {
    setBusy(true);
    setError("");
    try {
      await rosterRequest(
        "/api/admin/terms",
        term
          ? {
              id: term.id,
              code: term.code,
              name: term.name,
              isCurrent: term.isCurrent,
              isActive: term.isActive,
            }
          : { code, name, isCurrent: current, isActive: true },
        term ? "PATCH" : "POST",
      );
      setCode("");
      setName("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold">School Terms</h2>
      <p className="text-sm">
        Add the school year and semester before importing classes or enrolling students.
      </p>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="grid gap-2 text-sm">
          Term code
          <input
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="2026-1ST-SEM"
            required
            maxLength={64}
          />
        </label>
        <label className="grid gap-2 text-sm">
          Term name
          <input
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2026 · First Semester"
            required
            maxLength={120}
          />
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={current}
            onChange={(e) => setCurrent(e.target.checked)}
          />
          Make current term
        </label>
        <button className={secondaryClass} disabled={busy}>
          Create Term
        </button>
      </form>
      <ul className="divide-y divide-slate-200 dark:divide-white/15">
        {terms.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <strong>{t.name}</strong>
              <p className="text-sm">
                {t.code} · {t.isActive ? "Active" : "Closed"}
                {t.isCurrent ? " · Current" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {!t.isCurrent && t.isActive && (
                <button
                  className={secondaryClass}
                  disabled={busy}
                  onClick={() => save({ ...t, isCurrent: true })}
                >
                  Make Current
                </button>
              )}
              <button
                className={secondaryClass}
                disabled={busy}
                onClick={() =>
                  save({ ...t, isActive: !t.isActive, isCurrent: false })
                }
              >
                {t.isActive ? "Close Term" : "Reopen Term"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
