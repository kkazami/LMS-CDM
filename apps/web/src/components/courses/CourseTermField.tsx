"use client";
import { useEffect, useState } from "react";
import { getCourseTerms } from "@/app/(dashboard)/[institute]/courses/actions";
import { fieldClass } from "@/components/admin/roster-client";
export default function CourseTermField({
  instituteCode,
}: {
  instituteCode: string;
}) {
  const [terms, setTerms] = useState<
      Array<{ id: string; name: string; isCurrent: boolean }>
    >([]),
    [value, setValue] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    getCourseTerms(instituteCode)
      .then((next) => {
        if (live) {
          setTerms(next);
          setValue(next.find((t) => t.isCurrent)?.id ?? next[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (live) setError("Could not load academic terms.");
      });
    return () => {
      live = false;
    };
  }, [instituteCode]);
  return (
    <label className="grid gap-2 text-sm font-semibold">
      Academic term
      <select
        aria-label="Academic term"
        className={fieldClass}
        name="termId"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
      >
        <option value="">Choose an active term</option>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
      {!terms.length && !error && (
        <span className="text-xs font-normal">
          An institute administrator must create an academic term before courses
          can be added.
        </span>
      )}
    </label>
  );
}
