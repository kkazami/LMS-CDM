"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { InstituteTheme } from "@/lib/theme";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { toast } from "@/components/common/Toast";
import { instructorCreateCourse } from "@/app/(dashboard)/[institute]/courses/actions";

interface InstructorCreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  instituteCode: string;
  theme: InstituteTheme;
}

const initialState = {
  message: "",
  errors: undefined as Record<string, string[]> | undefined,
};

function SubmitButton({ theme }: { theme: InstituteTheme }) {
  const { pending } = useFormStatus();
  return (
    <Button theme={theme} type="submit" loading={pending} className="w-full">
      Create Class
    </Button>
  );
}

export default function InstructorCreateCourseModal({
  open,
  onClose,
  instituteCode,
  theme,
}: InstructorCreateCourseModalProps) {
  const [state, formAction] = useActionState(instructorCreateCourse, initialState);

  useEffect(() => {
    if (state.message === "success") {
      toast.success("Class created!", "Your new class has been created successfully.");
      onClose();
    } else if (state.message && state.message !== "Validation failed.") {
      toast.error("Failed to create class", state.message);
    }
  }, [state, onClose]);

  return (
    <Modal open={open} title="Create a New Class" onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="instituteCode" value={instituteCode} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Class Code *
            </label>
            <Input
              name="code"
              placeholder="e.g. CS101"
              required
              theme={theme}
              className={state.errors?.code ? "border-red-500" : ""}
            />
            {state.errors?.code && (
              <p className="text-xs text-red-600">{state.errors.code[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Subject *</label>
            <Input
              name="subject"
              placeholder="e.g. Computer Science"
              required
              theme={theme}
              className={state.errors?.subject ? "border-red-500" : ""}
            />
            {state.errors?.subject && (
              <p className="text-xs text-red-600">{state.errors.subject[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Title *</label>
          <Input
            name="title"
            placeholder="e.g. Intro to Programming"
            required
            theme={theme}
            className={state.errors?.title ? "border-red-500" : ""}
          />
          {state.errors?.title && (
            <p className="text-xs text-red-600">{state.errors.title[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Section</label>
            <Input name="section" placeholder="e.g. A" theme={theme} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Room</label>
            <Input name="room" placeholder="e.g. Room 302" theme={theme} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 focus:border-orange-500"
            placeholder="Enter class description..."
          />
        </div>

        <div className="pt-2">
          <SubmitButton theme={theme} />
        </div>
      </form>
    </Modal>
  );
}
