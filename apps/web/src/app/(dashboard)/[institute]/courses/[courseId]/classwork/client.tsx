"use client";

import { useState, useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { InstituteTheme } from "@/lib/theme";
import SyllabusAccordion from "@/components/courses/SyllabusAccordion";
import AttachmentModal from "@/components/courses/AttachmentModal";
import type { AttachmentItem } from "@/components/courses/AttachmentModal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import { Plus, Loader2, Paperclip, FileText, Link2 } from "lucide-react";
import {
  createSyllabusItem,
  updateSyllabusItem,
  deleteSyllabusItem,
} from "./actions";

interface SyllabusItemAttachment {
  id?: string;
  type: string;
  url: string;
  fileName: string;
  fileSize?: number | null;
}

interface SyllabusItemData {
  id: string;
  type: string;
  title: string;
  description: string;
  dueDate: string | null;
  maxPoints: number | null;
  targetGroups: { groupId: string; group: { groupName: string } }[];
  attachments?: SyllabusItemAttachment[];
}

interface StudentGroup {
  id: string;
  groupName: string;
}

function SubmitButton({
  isEdit,
  theme,
}: {
  isEdit: boolean;
  theme: InstituteTheme;
}) {
  const { pending } = useFormStatus();
  return (
    <Button theme={theme} type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEdit ? "Save Changes" : "Add Item"}
    </Button>
  );
}

const initialState = {
  message: "",
  errors: undefined as Record<string, string[]> | undefined,
};

export default function ClassworkClient({
  items,
  courseId,
  instituteCode,
  theme,
  canEdit,
  studentGroups,
}: {
  items: SyllabusItemData[];
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
  canEdit: boolean;
  studentGroups: StudentGroup[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SyllabusItemData | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  
  const [selectedType, setSelectedType] = useState<string>("ASSIGNMENT");
  const [isCustomType, setIsCustomType] = useState(false);

  const predefinedTypes = ["ASSIGNMENT", "QUIZ", "MATERIAL", "ACTIVITY", "RECITATION", "MIDTERM_EXAM", "FINAL_EXAM"];

  const [state, formAction] = useActionState(
    editingItem ? updateSyllabusItem : createSyllabusItem,
    initialState
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message === "success") {
      setIsModalOpen(false);
      setEditingItem(null);
      setSelectedGroups([]);
      setAttachments([]);
    }
  }, [state]);

  const handleCreate = () => {
    setEditingItem(null);
    setSelectedGroups([]);
    setAttachments([]);
    setSelectedType("ASSIGNMENT");
    setIsCustomType(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: SyllabusItemData) => {
    setEditingItem(item);
    setSelectedGroups(item.targetGroups.map((tg) => tg.groupId));
    // Load existing attachments for this item
    setAttachments(
      (item.attachments ?? []).map((a) => ({
        id: a.id,
        type: a.type as "FILE" | "LINK",
        url: a.url,
        fileName: a.fileName,
        fileSize: a.fileSize ?? undefined,
      }))
    );
    
    if (predefinedTypes.includes(item.type)) {
      setSelectedType(item.type);
      setIsCustomType(false);
    } else {
      setSelectedType("CUSTOM");
      setIsCustomType(true);
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (confirm("Delete this item? This cannot be undone.")) {
      const res = await deleteSyllabusItem(itemId, courseId, instituteCode);
      if (res && !res.success) {
        alert(res.error || "Failed to delete item");
      }
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleAttachmentSave = (saved: AttachmentItem[]) => {
    setAttachments(saved);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button theme={theme} onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">
            No classwork yet
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {canEdit
              ? "Add assignments, quizzes, and materials for your students."
              : "Your instructor hasn't added any classwork yet."}
          </p>
        </div>
      ) : (
        <SyllabusAccordion
          items={items}
          theme={theme}
          canEdit={canEdit}
          instituteCode={instituteCode}
          courseId={courseId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={isModalOpen}
        title={editingItem ? "Edit Classwork Item" : "Add Classwork Item"}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
      >
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="instituteCode" value={instituteCode} />
          <input
            type="hidden"
            name="targetGroupIds"
            value={selectedGroups.join(",")}
          />
          <input
            type="hidden"
            name="attachments"
            value={JSON.stringify(
              attachments.map((a) => ({
                type: a.type,
                url: a.url,
                fileName: a.fileName,
              }))
            )}
          />
          {editingItem && (
            <input type="hidden" name="id" value={editingItem.id} />
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-800">Type</label>
            <select
              value={isCustomType ? "CUSTOM" : selectedType}
              onChange={(e) => {
                if (e.target.value === "CUSTOM") {
                  setIsCustomType(true);
                  setSelectedType(""); 
                } else {
                  setIsCustomType(false);
                  setSelectedType(e.target.value);
                }
              }}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
              style={{ borderColor: theme.colors.border }}
            >
              <option value="ASSIGNMENT">Assignment</option>
              <option value="QUIZ">Quiz</option>
              <option value="ACTIVITY">Activity</option>
              <option value="RECITATION">Recitation</option>
              <option value="MIDTERM_EXAM">Midterm Exam</option>
              <option value="FINAL_EXAM">Final Exam</option>
              <option value="MATERIAL">Material</option>
              <option value="CUSTOM">Add Custom...</option>
            </select>
            
            {isCustomType && (
              <Input
                name="typeCustom"
                placeholder="e.g. Laboratory Work"
                defaultValue={editingItem && !predefinedTypes.includes(editingItem.type) ? editingItem.type : ""}
                onChange={(e) => setSelectedType(e.target.value)}
                required
                theme={theme}
              />
            )}
            {/* We always submit the final resolved string as 'type' */}
            <input type="hidden" name="type" value={isCustomType && editingItem && !predefinedTypes.includes(editingItem.type) && !selectedType ? editingItem.type : selectedType} />
          </div>

          <Input
            name="title"
            label="Title"
            defaultValue={editingItem?.title}
            required
            placeholder="e.g. Chapter 1 Reading"
            theme={theme}
          />

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-800">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={editingItem?.description}
              rows={3}
              placeholder="Optional description or instructions"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              style={{ borderColor: theme.colors.border }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="dueDate"
              label="Due Date"
              type="date"
              defaultValue={
                editingItem?.dueDate
                  ? editingItem.dueDate.split("T")[0]
                  : undefined
              }
              theme={theme}
            />
            <Input
              name="maxPoints"
              label="Max Points"
              type="number"
              defaultValue={editingItem?.maxPoints?.toString()}
              placeholder="e.g. 100"
              theme={theme}
            />
          </div>

          {/* Attachments section */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-800">
              Attachments
            </label>

            {attachments.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-gray-300 p-2 max-h-28 overflow-y-auto">
                {attachments.map((att, idx) => {
                  const isLink = att.type === "LINK";
                  const Icon = isLink ? Link2 : FileText;
                  return (
                    <div
                      key={`${att.type}-${att.url}-${idx}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-gray-50 text-sm"
                    >
                      <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate flex-1 text-gray-700">
                        {att.fileName || att.url}
                      </span>
                      <span className="text-xs text-gray-400">
                        {isLink ? "Link" : "File"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAttachModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50"
            >
              <Paperclip className="h-4 w-4" />
              {attachments.length > 0
                ? `Manage Attachments (${attachments.length})`
                : "Add Files or Links"}
            </button>
          </div>

          {/* Target Group Selector */}
          {studentGroups.length > 0 && (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-800">
                Target Audience
              </label>
              <p className="text-xs text-gray-500">
                Leave all unchecked to make visible to all students
              </p>
              <div className="space-y-1.5 rounded-md border border-gray-300 p-3 max-h-32 overflow-y-auto">
                {studentGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      className="rounded border-gray-300"
                    />
                    {group.groupName}
                  </label>
                ))}
              </div>
            </div>
          )}

          {state.message && state.message !== "success" && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}

          <SubmitButton isEdit={!!editingItem} theme={theme} />
        </form>
      </Modal>

      {/* Attachment Modal (nested, for instructor create/edit) */}
      <AttachmentModal
        open={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onSave={handleAttachmentSave}
        existingAttachments={attachments}
        theme={theme}
        title="Attach Files & Links"
      />
    </div>
  );
}
