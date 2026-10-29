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
import DeleteClassworkDialog from '@/components/courses/DeleteClassworkDialog';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import FocusButton from "@/components/focus/FocusButton";
import { Plus, Loader2, Paperclip, FileText, Link2, Shield, Trophy, X, Sparkles, Calendar, Clock } from "lucide-react";
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
  labAssignmentId?: string | null;
  labStartsAt?: string | null;
  formId?: string | null;
  formStartsAt?: string | null;
  type: string;
  title: string;
  description: string;
  dueDate: string | null;
  maxPoints: number | null;
  enableIntegrityMonitoring?: boolean;
  requireFullscreen?: boolean;
  leaderboardEnabled?: boolean;
  leaderboardRewards?: { placement: number; rewardLabel: string; bonusExp: number }[];
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
  labsReady = true,
  studentGroups,
}: {
  items: SyllabusItemData[];
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
  canEdit: boolean;
  labsReady?: boolean;
  studentGroups: StudentGroup[];
}) {
  const router = useRouter();
  const [deletingItem, setDeletingItem] = useState<SyllabusItemData | null>(null);
  const [deleteNotice, setDeleteNotice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SyllabusItemData | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  
  const [selectedType, setSelectedType] = useState<string>("ASSIGNMENT");
  const [isCustomType, setIsCustomType] = useState(false);
  const [enableIntegrity, setEnableIntegrity] = useState(false);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [rewardTiers, setRewardTiers] = useState<{placement: number; rewardLabel: string; bonusExp: number}[]>([]);

  const predefinedTypes = ["ASSIGNMENT", "QUIZ", "MATERIAL", "ACTIVITY", "RECITATION", "MIDTERM_EXAM", "FINAL_EXAM"];
  const isIte = instituteCode?.toLowerCase() === "ite";

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
      setEnableIntegrity(false);
      setRequireFullscreen(false);
      setLeaderboardEnabled(false);
      setRewardTiers([]);
    }
  }, [state]);

  const handleCreate = () => {
    setEditingItem(null);
    setSelectedGroups([]);
    setAttachments([]);
    setSelectedType("ASSIGNMENT");
    setIsCustomType(false);
    setEnableIntegrity(false);
    setRequireFullscreen(false);
    setLeaderboardEnabled(false);
    setRewardTiers([]);
    setIsModalOpen(true);
  };

  const handleEdit = (item: SyllabusItemData) => {
    setEditingItem(item);
    setSelectedGroups(item.targetGroups.map((tg) => tg.groupId));
    setEnableIntegrity(Boolean(item.enableIntegrityMonitoring));
    setRequireFullscreen(Boolean(item.requireFullscreen));
    setLeaderboardEnabled(Boolean(item.leaderboardEnabled));
    setRewardTiers(item.leaderboardRewards || []);
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

  const handleDelete = (itemId: string) => {
    const item = items.find(row => row.id === itemId);
    if (item && canEdit) { setDeleteNotice(''); setDeletingItem(item); }
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <FocusButton
            contextType="STUDY"
            courseId={courseId}
            title="Classwork Study"
          />
        </div>
        {canEdit && instituteCode.toLowerCase() === 'ics' && !labsReady && <p role="status" className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">Guided practical labs need a database upgrade before they can be used. Existing Classwork is available.</p>}
        {canEdit && (
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/${instituteCode}/courses/${courseId}/classwork/forms/new`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Sparkles className="h-4 w-4" />
              <span>Create Form Assessment</span>
            </Link>

            <Button theme={theme} variant="secondary" onClick={handleCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Material / Task
            </Button>
            {instituteCode.toLowerCase() === 'ics' && <Link href={`/${instituteCode}/courses/${courseId}/labs`} className="inline-flex min-h-11 items-center rounded-xl border border-orange-200 px-4 py-2 text-sm font-medium text-orange-800 dark:border-orange-800 dark:text-orange-200">Guided practical labs</Link>}
          </div>
        )}
      </div>

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

      {deleteNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">{deleteNotice}</p>}
      {deletingItem && <DeleteClassworkDialog title={deletingItem.title} theme={theme} onClose={() => setDeletingItem(null)} onDelete={async () => {
        const result = await deleteSyllabusItem(deletingItem.id, courseId, instituteCode);
        if (!result?.success) throw new Error(result?.error || 'Classwork could not be deleted. Please try again.');
      }} onDeleted={() => { setDeleteNotice(`“${deletingItem.title}” was deleted.`); setDeletingItem(null); router.refresh(); }}/>}

      {/* Create/Edit Modal */}
      <Modal
        open={isModalOpen}
        title={editingItem ? "Edit Classwork Item" : "Add Classwork Item"}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
      >
        <form ref={formRef} action={formAction} className="space-y-4 max-h-[75vh] overflow-y-auto px-2 py-1.5">
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
          <input type="hidden" name="leaderboardEnabled" value={leaderboardEnabled ? "true" : "false"} />
          <input type="hidden" name="rewardTiers" value={JSON.stringify(rewardTiers)} />
          {editingItem && (
            <input type="hidden" name="id" value={editingItem.id} />
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">Type</label>
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
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none"
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
            <label className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={editingItem?.description}
              rows={3}
              placeholder="Optional description or instructions"
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Due Date & Due Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-[#8B92A5]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                name="dueDate"
                defaultValue={
                  editingItem?.dueDate
                    ? editingItem.dueDate.split("T")[0]
                    : undefined
                }
                className="w-full min-h-11 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-[#8B92A5]">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Due Time</span>
              </label>
              <input
                type="time"
                name="dueTime"
                defaultValue={
                  editingItem?.dueDate && editingItem.dueDate.includes("T")
                    ? (() => {
                        const d = new Date(editingItem.dueDate);
                        const hours = String(d.getHours()).padStart(2, "0");
                        const mins = String(d.getMinutes()).padStart(2, "0");
                        return `${hours}:${mins}`;
                      })()
                    : "23:59"
                }
                className="w-full min-h-11 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
              />
            </div>
          </div>

          <Input
            name="maxPoints"
            label="Max Points"
            type="number"
            defaultValue={editingItem?.maxPoints?.toString()}
            placeholder="e.g. 100"
            theme={theme}
          />

          {/* Proctoring & Integrity Monitoring Settings */}
          {(selectedType !== "MATERIAL") && (
            <div className={`rounded-2xl border p-4 space-y-3 ${
              isIte
                ? "border-blue-500/20 bg-blue-500/4"
                : "border-orange-500/20 bg-orange-500/4"
            }`}>
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${isIte ? "text-blue-500" : "text-orange-500"}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-[#F0F2F8]">
                  Anti-Cheating & Integrity Settings
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="enableIntegrityMonitoring"
                  checked={enableIntegrity}
                  onChange={(e) => {
                    setEnableIntegrity(e.target.checked);
                    if (!e.target.checked) setRequireFullscreen(false);
                  }}
                  className={`mt-0.5 rounded border-slate-300 dark:border-white/20 ${
                    isIte
                      ? "text-blue-600 focus:ring-blue-500"
                      : "text-orange-500 focus:ring-orange-500"
                  }`}
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">
                    Enable Integrity Monitoring
                  </span>
                  <p className="text-slate-500 dark:text-[#8B92A5] mt-0.5">
                    Tracks tab switches, clipboard activity, and window focus during attempts. Results are presented for instructor review without auto-failing students.
                  </p>
                </div>
              </label>

              {enableIntegrity && (
                <label className={`flex items-start gap-3 cursor-pointer select-none pl-6 border-t pt-2.5 ${
                  isIte ? "border-blue-500/10" : "border-orange-500/10"
                }`}>
                  <input
                    type="checkbox"
                    name="requireFullscreen"
                    checked={requireFullscreen}
                    onChange={(e) => setRequireFullscreen(e.target.checked)}
                    className={`mt-0.5 rounded border-slate-300 dark:border-white/20 ${
                      isIte
                        ? "text-blue-600 focus:ring-blue-500"
                        : "text-orange-500 focus:ring-orange-500"
                    }`}
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">
                      Require Fullscreen Mode
                    </span>
                    <p className="text-slate-500 dark:text-[#8B92A5] mt-0.5">
                      Prompts student to take the assessment in fullscreen and logs when fullscreen is exited.
                    </p>
                  </div>
                </label>
              )}

              {enableIntegrity && attachments.length > 0 && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-bold text-[11px]">Notice for external files & links</p>
                  <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                    Opening attached files or links takes students outside the active window, which logs tab switches. For tasks requiring external references, you may want to leave integrity monitoring off.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Settings */}
          {selectedType !== "MATERIAL" && (
            <div className={`rounded-2xl border p-4 space-y-3 ${
              isIte
                ? "border-blue-500/20 bg-blue-500/4"
                : "border-amber-500/20 bg-amber-500/4"
            }`}>
              <div className="flex items-center gap-2">
                <Trophy className={`w-4 h-4 ${isIte ? "text-blue-500" : "text-amber-500"}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-[#F0F2F8]">
                  Leaderboard
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={leaderboardEnabled}
                  onChange={(e) => {
                    setLeaderboardEnabled(e.target.checked);
                    if (!e.target.checked) setRewardTiers([]);
                  }}
                  className={`mt-0.5 rounded border-slate-300 dark:border-white/20 ${
                    isIte
                      ? "text-blue-600 focus:ring-blue-500"
                      : "text-amber-500 focus:ring-amber-500"
                  }`}
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">
                    Enable Leaderboard
                  </span>
                  <p className="text-slate-500 dark:text-[#8B92A5] mt-0.5">
                    Rank students by score and show results in the Course leaderboard tab.
                  </p>
                </div>
              </label>

              {leaderboardEnabled && (
                <div className={`space-y-2 pt-2 border-t ${isIte ? "border-blue-500/10" : "border-amber-500/10"}`}>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-[#8B92A5]">
                    Rewards (optional)
                  </p>
                  {rewardTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-[#8B92A5]">Top</span>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={tier.placement}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            const updated = [...rewardTiers];
                            updated[idx] = { ...updated[idx], placement: val };
                            setRewardTiers(updated);
                          }}
                          className="w-10 text-center text-xs font-mono font-bold text-slate-900 dark:text-[#F0F2F8] bg-transparent outline-none"
                          title="Number of top participants who receive this reward"
                        />
                      </div>
                      <input
                        type="text"
                        value={tier.rewardLabel}
                        onChange={(e) => {
                          const updated = [...rewardTiers];
                          updated[idx] = { ...updated[idx], rewardLabel: e.target.value };
                          setRewardTiers(updated);
                        }}
                        placeholder="e.g. +5 bonus points on final grade"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400"
                      />
                      <input
                        type="number"
                        value={tier.bonusExp || ""}
                        onChange={(e) => {
                          const updated = [...rewardTiers];
                          updated[idx] = { ...updated[idx], bonusExp: parseInt(e.target.value, 10) || 0 };
                          setRewardTiers(updated);
                        }}
                        placeholder="EXP"
                        className={`w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs font-mono outline-none placeholder:text-slate-400 ${
                          isIte ? "text-blue-600" : "text-amber-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setRewardTiers(rewardTiers.filter((_, i) => i !== idx))}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRewardTiers([...rewardTiers, { placement: rewardTiers.length === 0 ? 1 : (rewardTiers[rewardTiers.length - 1].placement + 2), rewardLabel: "", bonusExp: 0 }])}
                    className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      isIte ? "text-blue-600 hover:text-blue-500" : "text-amber-600 hover:text-amber-500"
                    }`}
                  >
                    <Plus className="w-3 h-3" /> Add Reward
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Attachments section */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">
              Attachments
            </label>

            {attachments.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-white/10 p-2 max-h-28 overflow-y-auto bg-slate-50/50 dark:bg-white/2">
                {attachments.map((att, idx) => {
                  const isLink = att.type === "LINK";
                  const Icon = isLink ? Link2 : FileText;
                  return (
                    <div
                      key={`${att.type}-${att.url}-${idx}`}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#1E2132] border border-slate-100 dark:border-white/5 text-sm"
                    >
                      <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate flex-1 text-slate-700 dark:text-[#F0F2F8] text-xs">
                        {att.fileName || att.url}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
              className={`flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-white/15 py-2.5 text-xs font-semibold text-slate-600 dark:text-[#8B92A5] transition-colors ${
                isIte
                  ? "hover:border-blue-600 hover:text-blue-600 hover:bg-blue-500/5"
                  : "hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5"
              } cursor-pointer`}
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
              <label className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">
                Target Audience
              </label>
              <p className="text-xs text-slate-400 dark:text-[#8B92A5]">
                Leave all unchecked to make visible to all students
              </p>
              <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-white/10 p-3 max-h-32 overflow-y-auto bg-slate-50/50 dark:bg-white/2">
                {studentGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-[#F0F2F8] hover:text-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      className={`rounded border-slate-300 dark:border-white/20 ${
                        isIte ? "text-blue-600" : "text-[#F97316]"
                      }`}
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
