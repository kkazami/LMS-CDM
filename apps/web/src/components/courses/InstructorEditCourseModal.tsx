"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { InstituteTheme } from "@/lib/theme";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { toast } from "@/components/common/Toast";
import { instructorUpdateCourse } from "@/app/(dashboard)/[institute]/courses/actions";

interface InstructorEditCourseModalProps {
  open: boolean;
  onClose: () => void;
  instituteCode: string;
  theme: InstituteTheme;
  course: {
    id: string;
    code: string;
    title: string;
    section: string;
    subject: string;
    room: string;
    description?: string;
  } | null;
}

const initialState = {
  message: "",
  errors: undefined as Record<string, string[]> | undefined,
};

function SubmitButton({ theme }: { theme: InstituteTheme }) {
  const { pending } = useFormStatus();
  return (
    <Button theme={theme} type="submit" loading={pending} className="w-full">
      Save Changes
    </Button>
  );
}

export default function InstructorEditCourseModal({
  open,
  onClose,
  instituteCode,
  theme,
  course,
}: InstructorEditCourseModalProps) {
  const [state, formAction] = useActionState(instructorUpdateCourse, initialState);

  useEffect(() => {
    if (state.message === "success") {
      toast.success("Class updated!", "The class details have been updated successfully.");
      onClose();
    } else if (state.message && state.message !== "Validation failed.") {
      toast.error("Failed to update class", state.message);
    }
  }, [state, onClose]);

  if (!course) return null;

  return (
    <Modal open={open} title="Edit Class Details" onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="instituteCode" value={instituteCode} />
        <input type="hidden" name="id" value={course.id} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Class Code *
            </label>
            <Input
              name="code"
              defaultValue={course.code}
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
            <label className="text-sm font-medium text-gray-700">Subject *</label>
            <Input
              name="subject"
              defaultValue={course.subject}
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
          <label className="text-sm font-medium text-gray-700">Title *</label>
          <Input
            name="title"
            defaultValue={course.title}
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
            <label className="text-sm font-medium text-gray-700">Section</label>
            <Input name="section" defaultValue={course.section} placeholder="e.g. A" theme={theme} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Room</label>
            <Input name="room" defaultValue={course.room} placeholder="e.g. Room 302" theme={theme} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            defaultValue={course.description || ""}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
