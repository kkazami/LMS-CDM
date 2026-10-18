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
  adminSetCourseProgram,
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
  programId: string | null;
  program: (Program & { isActive: boolean }) | null;
  instructorId: string | null;
  instructor: { id: string; name: string; email: string } | null;
  createdAt: Date;
  _count: { enrollments: number };
}

type Program = { id: string; code: string; name: string };
const selectClass = "w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] focus-visible:outline-2 focus-visible:outline-orange-600";

function ProgramOptions({ programs, course }: { programs: Program[]; course?: CourseWithInstructor | null }) {
  return <>
    <option value="">No program assigned</option>
    {course?.program && !programs.some(p => p.id === course.programId) && <option value={course.program.id}>{course.program.code} (inactive)</option>}
    {programs.map(program => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}
  </>;
}

function CourseProgramEditor({ course, programs, instituteCode }: { course: CourseWithInstructor; programs: Program[]; instituteCode: string }) {
  const [state, action, pending] = useActionState(adminSetCourseProgram, { message: "" });
  return <form action={action} className="min-w-52 space-y-2">
    <input type="hidden" name="id" value={course.id} />
    <input type="hidden" name="instituteCode" value={instituteCode} />
    <select key={course.programId ?? ''} name="programId" aria-label={`Program for ${course.code} ${course.section}`} defaultValue={course.programId ?? ''} disabled={pending} className={selectClass}>
      <ProgramOptions programs={programs} course={course} />
    </select>
    <button disabled={pending} className="min-h-9 rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-orange-600 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5">{pending ? 'Saving…' : 'Save program'}</button>
    <p role="status" className="text-xs">{state.message}</p>
  </form>;
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
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-2 py-0.5 font-mono text-xs text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
      title="Copy join code"
    >
      {code || "—"}
      {copied ? (
        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
      ) : (
        <Copy className="h-3 w-3 text-slate-400 dark:text-slate-500" />
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
  programs,
  initialInstructorId = "",
  instituteCode,
  theme,
}: {
  courses: CourseWithInstructor[];
  programs: Program[];
  initialInstructorId?: string;
  instituteCode: string;
  theme: InstituteTheme;
}) {
  const [instructorFilter, setInstructorFilter] = useState(initialInstructorId);
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
    { key: "section", header: "Section" },
    { key: "program", header: "Program", render: row => <CourseProgramEditor key={row.id} course={row} programs={programs} instituteCode={instituteCode} /> },
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
          <span className="text-xs font-semibold text-slate-800 dark:text-[#F0F2F8]">{row.instructor.name}</span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">Unassigned</span>
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
            className="text-slate-400 hover:text-slate-900 dark:hover:text-[#F0F2F8] transition cursor-pointer p-1"
            aria-label="Edit course"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer p-1"
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
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <label className="grid gap-2 text-sm font-semibold">Instructor
          <select aria-label="Instructor" value={instructorFilter} onChange={event => setInstructorFilter(event.target.value)} className={selectClass}>
            <option value="">All instructors</option>
            <option value="unassigned">No instructor assigned</option>
            {Array.from(new Map(courses.flatMap(course => course.instructor ? [[course.instructor.id, course.instructor] as const] : [])).values()).sort((a, b) => a.name.localeCompare(b.name)).map(instructor => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
          </select>
        </label>
        <Button theme={theme} onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Course
        </Button>
      </div>

      <Table
        theme={theme}
        columns={columns as unknown as TableColumn<Record<string, unknown>>[]}
        rows={courses.filter(course => !instructorFilter || (instructorFilter === "unassigned" ? !course.instructorId : course.instructorId === instructorFilter)) as unknown as Record<string, unknown>[]}
        emptyMessage="No classes found for this instructor."
      />

      <Modal
        open={isModalOpen}
        title={editingCourse ? "Edit Course" : "Create Course"}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
      >
        <form key={editingCourse?.id ?? "new"} action={formAction} className="space-y-4">
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
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={editingCourse?.description}
              placeholder="Course description (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              <UserPlus className="inline h-4 w-4 mr-1 -mt-0.5" />
              Assign Instructor
            </label>
            <select
              name="instructorId"
              defaultValue={editingCourse?.instructorId || ""}
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
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

          <label className="grid gap-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Program
            <select aria-label="Program" name="programId" defaultValue={editingCourse?.programId ?? ''} className={selectClass} aria-describedby="course-program-help">
              <ProgramOptions programs={programs} course={editingCourse} />
            </select>
            <span id="course-program-help" className="font-normal text-slate-500 dark:text-slate-400">Optional. Choose the actual program; the section name does not assign one.</span>
          </label>

          <SubmitButton isEdit={!!editingCourse} theme={theme} />
        </form>
      </Modal>
    </>
  );
}
