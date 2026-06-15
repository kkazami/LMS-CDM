"use client";

import { useState } from "react";
import type { Course } from "@prisma/client";
import type { InstituteTheme } from "@/lib/theme";
import Table, { TableColumn } from "@/components/common/Table";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import { CourseForm } from "@/components/forms/CourseForm";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { deleteCourse } from "./actions";

export default function CoursesClient({
  courses,
  instituteCode,
  theme,
  canEdit,
}: {
  courses: Course[];
  instituteCode: string;
  theme: InstituteTheme;
  canEdit: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const handleCreate = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      const res = await deleteCourse(id, instituteCode);
      if (res && !res.success) {
        alert(res.error || "Failed to delete course");
      }
    }
  };

  const columns: TableColumn<Course>[] = [
    { key: "code", header: "Code" },
    { key: "title", header: "Title" },
  ];

  if (canEdit) {
    columns.push({
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
    });
  }

  return (
    <>
      {canEdit && (
        <div className="flex justify-end mb-4">
          <Button theme={theme} onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Course
          </Button>
        </div>
      )}

      <Table theme={theme} columns={columns} rows={courses} emptyMessage="No courses available." />

      <Modal
        open={isModalOpen}
        title={editingCourse ? "Edit Course" : "Create Course"}
        onClose={() => setIsModalOpen(false)}
      >
        <CourseForm
          course={editingCourse}
          theme={theme}
          instituteCode={instituteCode}
          onSuccess={() => setIsModalOpen(false)}
        />
      </Modal>
    </>
  );
}
