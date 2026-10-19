"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Modal from "@/components/common/Modal";
import type { InstituteTheme } from "@/lib/theme";
import type { LMSUser } from "@/lib/admin-types";
import { fieldClass, secondaryClass, rosterRequest } from "./roster-client";
export default function UserProfileModal({
  open,
  mode,
  theme,
  instituteCode,
  user,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  theme: InstituteTheme;
  instituteCode: string;
  user?: LMSUser;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [role, setRole] = useState(user?.role ?? "STUDENT"),
    [name, setName] = useState(user?.name ?? "");
  const [first, setFirst] = useState(user?.firstName ?? ""),
    [last, setLast] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? ""),
    [id, setId] = useState(user?.studentNumber ?? user?.uniqueId ?? "");
  const [program, setProgram] = useState(user?.program ?? ""),
    [section, setSection] = useState(user?.section ?? "");
  const [programs, setPrograms] = useState<
      Array<{ code: string; name: string }>
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [temporary, setTemporary] = useState("");
  useEffect(() => {
    if (open)
      rosterRequest<{ programs: Array<{ code: string; name: string }> }>(
        "/api/admin/terms",
      )
        .then((data) => setPrograms(data.programs))
        .catch((e) => setError(e.message));
  }, [open]);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const student = role === "STUDENT";
      const body = student
        ? {
            first_name: first,
            last_name: last,
            email,
            studentNumber: id,
            program,
            section,
            role,
            instituteCode,
          }
        : { name, email, uniqueId: id, role, instituteCode };
      const response = await rosterRequest<{
        temporaryPassword?: string;
        message: string;
      }>(
        mode === "create" ? "/api/admin/users" : "/api/admin/users/" + user?.id,
        body,
        mode === "create" ? "POST" : "PATCH",
      );
      if (response.temporaryPassword && !student) {
        setTemporary(response.temporaryPassword);
        return;
      }
      onSuccess(response.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      title={mode === "create" ? "Create User" : "Edit User"}
      onClose={onClose}
    >
      {temporary ? (
        <div className="space-y-4">
          <p>Instructor credentials are shown once. Share them securely.</p>
          <p className="break-all rounded-lg border p-4 font-mono">
            {temporary}
          </p>
          <button
            className={secondaryClass}
            onClick={() => onSuccess("Instructor created.")}
          >
            Done
          </button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {mode === "create" && (
            <label className="grid gap-2 text-sm">
              Account type
              <select
                className={fieldClass}
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "STUDENT" | "INSTRUCTOR")
                }
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
              </select>
            </label>
          )}
          {role === "STUDENT" ? (
            <>
              <label className="grid gap-2 text-sm">
                First name
                <input
                  className={fieldClass}
                  required
                  maxLength={100}
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Last name
                <input
                  className={fieldClass}
                  required
                  maxLength={100}
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="grid gap-2 text-sm">
              Full name
              <input
                className={fieldClass}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label className="grid gap-2 text-sm">
            Email
            <input
              className={fieldClass}
              type="email"
              required
              value={email}
              readOnly={
                mode === "edit" &&
                user?.activationStatus === "PENDING_ACTIVATION"
              }
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode === "edit" &&
            user?.activationStatus === "PENDING_ACTIVATION" && (
              <Link
                className="inline-block text-sm underline underline-offset-4"
                href={"/" + instituteCode + "/admin/onboarding?tab=invitations"}
              >
                Correct Email and Send New Invitation
              </Link>
            )}
          <label className="grid gap-2 text-sm">
            {role === "STUDENT" ? "Student ID" : "Employee ID"}
            <input
              className={fieldClass}
              value={id}
              required={role === "STUDENT"}
              readOnly={mode === "edit" && role === "STUDENT"}
              maxLength={64}
              pattern={role === "STUDENT" ? "[A-Za-z0-9-]+" : undefined}
              onChange={(e) => setId(e.target.value)}
            />
          </label>
          {role === "STUDENT" && (
            <>
              <label className="grid gap-2 text-sm">
                Program
                <select
                  className={fieldClass}
                  value={program}
                  required
                  onChange={(e) => setProgram(e.target.value)}
                >
                  <option value="">Choose an active program</option>
                  {programs.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} · {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                Section
                <input
                  className={fieldClass}
                  required
                  maxLength={100}
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </label>
              {mode === "create" && (
                <p className="text-sm">
                  Students set their own password through an activation
                  invitation. No temporary password is created.
                </p>
              )}
            </>
          )}
          <p className="text-sm">Institute: {instituteCode.toUpperCase()}</p>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            className={secondaryClass + " w-full"}
            style={{ borderColor: theme.colors.primary }}
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : mode === "create"
                ? "Create User"
                : "Save Changes"}
          </button>
        </form>
      )}
    </Modal>
  );
}
