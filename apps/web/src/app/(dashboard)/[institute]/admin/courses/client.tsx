"use client";

import { useState, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Table, { type TableColumn } from "@/components/common/Table";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import Badge from "@/components/common/Badge";
import { Edit2, Plus, Trash2, Copy, Check, UserPlus } from "lucide-react";
import {
  adminCreateCourse,
  adminUpdateCourse,
  adminDeleteCourse,
  getInstructors,
} from "./actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

interface CourseWithInstructor {
  id: string;
  code: string;
  courseCode: string;
  title: string;
  section: string;
  subject: string;
  room: string;
  description: string;
  instructorId: string | null;
  instructor: { id: string; name: string; email: string } | null;
  createdAt: Date;
  _count: { enrollments: number };
}

interface Instructor {
  id: string;
  name: string;
  email: string;
}

function SubmitButton({ isEdit, theme }: { isEdit: boolean; theme: InstituteTheme }) {
  const { pending } = useFormStatus();
  return (
    <Button theme={theme} type="submit" disabled={pending} className="w-full">
      {pending && (
        <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
        </svg>
      )}
      {isEdit ? "Save Changes" : "Create Course"}
    </Button>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 hover:bg-gray-200 transition-colors"
      title="Copy join code"
    >
      {code || "—"}
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-gray-400" />
      )}
    </button>
  );
}

const initialState = {
  message: "",
  errors: undefined as Record<string, string[]> | undefined,
};

export default function AdminCoursesClient({
  courses,
  instituteCode,
  theme,
}: {
  courses: CourseWithInstructor[];
  instituteCode: string;
  theme: InstituteTheme;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithInstructor | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  const [state, formAction] = useActionState(
    editingCourse ? adminUpdateCourse : adminCreateCourse,
    initialState
  );

  useEffect(() => {
    getInstructors(instituteCode).then(setInstructors);
  }, [instituteCode]);

  useEffect(() => {
    if (state.message === "success") {
      setIsModalOpen(false);
      setEditingCourse(null);
    }
  }, [state]);

  const handleCreate = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleEdit = (course: CourseWithInstructor) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this course? All enrollments and materials will be permanently removed.")) {
      const res = await adminDeleteCourse(id, instituteCode);
      if (res && !res.success) {
        alert(res.error || "Failed to delete course");
      }
    }
  };

  const columns: TableColumn<CourseWithInstructor>[] = [
    { key: "code", header: "Code" },
    { key: "title", header: "Title" },
    {
      key: "courseCode",
      header: "Join Code",
      render: (row) => <CopyCodeButton code={row.courseCode} />,
    },
    { key: "subject", header: "Subject" },
    {
      key: "instructor",
      header: "Instructor",
      render: (row) =>
        row.instructor ? (
          <span className="text-sm">{row.instructor.name}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">Unassigned</span>
        ),
    },
    {
      key: "enrollments",
      header: "Students",
      render: (row) => (
        <Badge theme={theme}>{row._count.enrollments}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-gray-500 hover:text-gray-900 transition"
            aria-label="Edit course"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-500 hover:text-red-700 transition"
            aria-label="Delete course"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button theme={theme} onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Course
        </Button>
      </div>

      <Table
        theme={theme}
        columns={columns as unknown as TableColumn<Record<string, unknown>>[]}
        rows={courses as unknown as Record<string, unknown>[]}
        emptyMessage="No courses created yet. Click 'New Course' to get started."
      />

      <Modal
        open={isModalOpen}
        title={editingCourse ? "Edit Course" : "Create Course"}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="instituteCode" value={instituteCode} />
          {editingCourse && (
            <input type="hidden" name="id" value={editingCourse.id} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="code"
              label="Course Code"
              defaultValue={editingCourse?.code}
              required
              placeholder="e.g. CS101"
              theme={theme}
            />
            <Input
              name="subject"
              label="Subject"
              defaultValue={editingCourse?.subject}
              required
              placeholder="e.g. Computer Science"
              theme={theme}
            />
          </div>

          <Input
            name="title"
            label="Course Title"
            defaultValue={editingCourse?.title}
            required
            placeholder="e.g. Introduction to Programming"
            theme={theme}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="section"
              label="Section"
              defaultValue={editingCourse?.section}
              placeholder="e.g. Section A"
              theme={theme}
            />
            <Input
              name="room"
              label="Room"
              defaultValue={editingCourse?.room}
              placeholder="e.g. Room 301"
              theme={theme}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-800">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={editingCourse?.description}
              placeholder="Course description (optional)"
              rows={3}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              style={{ borderColor: theme.colors.border }}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-800">
              <UserPlus className="inline h-4 w-4 mr-1 -mt-0.5" />
              Assign Instructor
            </label>
            <select
              name="instructorId"
              defaultValue={editingCourse?.instructorId || ""}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              style={{ borderColor: theme.colors.border }}
            >
              <option value="">— No instructor assigned —</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.email})
                </option>
              ))}
            </select>
          </div>

          {state.message && state.message !== "success" && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}
          {state.errors &&
            Object.entries(state.errors).map(([field, msgs]) => (
              <p key={field} className="text-sm text-red-600">
                {field}: {(msgs as string[]).join(", ")}
              </p>
            ))}

          <SubmitButton isEdit={!!editingCourse} theme={theme} />
        </form>
      </Modal>
    </>
  );
}
