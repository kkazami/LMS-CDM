"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import type { Course } from "@prisma/client";
import type { InstituteTheme } from "@/lib/theme";
import { createCourse, updateCourse } from "@/app/(dashboard)/[institute]/courses/actions";

const initialState = {
  message: "",
  errors: undefined as Record<string, string[]> | undefined,
};

function SubmitButton({ isEdit, theme }: { isEdit: boolean; theme: InstituteTheme }) {
  const { pending } = useFormStatus();

  return (
    <Button theme={theme} type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEdit ? "Save Changes" : "Create Course"}
    </Button>
  );
}

export function CourseForm({
  course,
  theme,
  instituteCode,
  onSuccess,
}: {
  course?: Course | null;
  theme: InstituteTheme;
  instituteCode: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(
    course ? updateCourse : createCourse,
    initialState
  );
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message === "success") {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="instituteCode" value={instituteCode} />
      {course && <input type="hidden" name="id" value={course.id} />}
      
      <div>
        <Input
          name="code"
          label="Course Code" // In place of label prop since it's common. Just passing raw props.
          defaultValue={course?.code}
          required
          placeholder="e.g. CS101"
          theme={theme}
        />
        {state.errors?.code && (
          <p className="mt-1 text-sm text-red-600">{state.errors.code.join(", ")}</p>
        )}
      </div>

      <div>
        <Input
          name="title"
          label="Course Title"
          defaultValue={course?.title}
          required
          placeholder="e.g. Introduction to Computer Science"
          theme={theme}
        />
        {state.errors?.title && (
          <p className="mt-1 text-sm text-red-600">{state.errors.title.join(", ")}</p>
        )}
      </div>

      {state.message && state.message !== "success" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <SubmitButton isEdit={!!course} theme={theme} />
    </form>
  );
}
