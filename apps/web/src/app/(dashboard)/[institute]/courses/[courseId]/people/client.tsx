"use client";

import { useState, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Badge from "@/components/common/Badge";
import UserAvatar from "@/components/common/UserAvatar";
import UserMiniCard from "@/components/common/UserMiniCard";
import PrivateCommentDrawer from "@/components/courses/PrivateCommentDrawer";
import {
  approveEnrollment,
  declineEnrollment,
  approveAllPending,
  sendPrivateComment,
  getPrivateComments,
  createStudentGroup,
  deleteStudentGroup,
} from "./actions";
import {
  Check,
  X,
  MessageSquare,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Crown,
} from "lucide-react";

interface Student {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface PendingRequest {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface StudentGroupData {
  id: string;
  groupName: string;
  members: { id: string; name: string }[];
}

interface Comment {
  id: string;
  content: string;
  sentiment: string | null;
  createdAt: string | Date;
  sender: { id: string; name: string };
}

export default function PeopleClient({
  courseId,
  instituteCode,
  theme,
  instructor,
  enrolledStudents,
  pendingRequests,
  studentGroups,
  canManage,
  currentUserId,
}: {
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
  instructor: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  enrolledStudents: Student[];
  pendingRequests: PendingRequest[];
  studentGroups: StudentGroupData[];
  canManage: boolean;
  currentUserId: string;
}) {
  // Private comment drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sendingComment, setSendingComment] = useState(false);

  // Group creation modal state
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  );

  // MiniCard state
  const [miniCard, setMiniCard] = useState<{ userId: string; anchorRect: DOMRect } | null>(null);

  const openCommentDrawer = async (student: Student) => {
    setSelectedStudent(student);
    setDrawerOpen(true);
    // Fetch comments
    const fetchedComments = await getPrivateComments(courseId, student.id);
    setComments(
      fetchedComments.map((c) => ({
        ...c,
        createdAt:
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : c.createdAt,
      }))
    );
  };

  const handleSendComment = async (content: string) => {
    if (!selectedStudent) return;
    setSendingComment(true);
    await sendPrivateComment(
      courseId,
      selectedStudent.id,
      content,
      instituteCode
    );
    // Refresh comments
    const updated = await getPrivateComments(courseId, selectedStudent.id);
    setComments(
      updated.map((c) => ({
        ...c,
        createdAt:
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : c.createdAt,
      }))
    );
    setSendingComment(false);
  };

  const handleApprove = async (enrollmentId: string) => {
    await approveEnrollment(enrollmentId, courseId, instituteCode);
  };

  const handleDecline = async (enrollmentId: string) => {
    await declineEnrollment(enrollmentId, courseId, instituteCode);
  };

  const handleApproveAll = async () => {
    if (
      confirm(
        `Approve all ${pendingRequests.length} pending requests?`
      )
    ) {
      await approveAllPending(courseId, instituteCode);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    if (selectedStudentIds.size === 0) {
      alert("Select at least one student for the group.");
      return;
    }

    await createStudentGroup(
      courseId,
      newGroupName.trim(),
      Array.from(selectedStudentIds),
      instituteCode
    );

    setGroupModalOpen(false);
    setNewGroupName("");
    setSelectedStudentIds(new Set());
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm("Delete this group? Students won't be removed from the course.")) {
      await deleteStudentGroup(groupId, courseId, instituteCode);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ─── Instructor Section ─── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] mb-3">
          Instructor
        </h2>
        {instructor ? (
          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
            <UserAvatar
              name={instructor.name}
              avatarUrl={instructor.avatarUrl}
              size="md"
              color={theme.colors.primary}
              onClick={(e: React.MouseEvent) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMiniCard({ userId: instructor.id, anchorRect: rect });
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                  {instructor.name}
                </span>
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-xs text-slate-500 dark:text-[#8B92A5]">{instructor.email}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">No instructor assigned</p>
        )}
      </section>

      {/* ─── Pending Requests ─── */}
      {canManage && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] flex items-center gap-2">
              Pending Requests
              <Badge theme={theme}>
                <span>{pendingRequests.length}</span>
              </Badge>
            </h2>
            <Button
              theme={theme}
              variant="secondary"
              onClick={handleApproveAll}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Approve All
            </Button>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.enrollmentId}
                className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={req.name}
                    avatarUrl={req.avatarUrl}
                    size="sm"
                    color="#F59E0B"
                    onClick={(e: React.MouseEvent) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMiniCard({ userId: req.id, anchorRect: rect });
                    }}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                      {req.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5]">{req.email}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-[#8B92A5]">
                    <Clock className="h-3 w-3" />
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(req.enrollmentId)}
                    className="rounded-xl bg-green-600 p-2 text-white hover:bg-green-700 transition cursor-pointer shadow-xs"
                    aria-label="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDecline(req.enrollmentId)}
                    className="rounded-xl bg-red-500 p-2 text-white hover:bg-red-600 transition cursor-pointer shadow-xs"
                    aria-label="Decline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Enrolled Students ─── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] mb-3">
          Students ({enrolledStudents.length})
        </h2>
        {enrolledStudents.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]">
            No students enrolled yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
            {enrolledStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={student.name}
                    avatarUrl={student.avatarUrl}
                    size="sm"
                    color={theme.colors.primary}
                    onClick={(e: React.MouseEvent) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMiniCard({ userId: student.id, anchorRect: rect });
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">
                      {student.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5]">{student.email}</p>
                  </div>
                </div>

                {canManage && (
                  <button
                    onClick={() => openCommentDrawer(student)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition cursor-pointer"
                    aria-label={`Private message ${student.name}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Student Groups ─── */}
      {canManage && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Student Groups
            </h2>
            <Button
              theme={theme}
              variant="secondary"
              onClick={() => setGroupModalOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Group
            </Button>
          </div>

          {studentGroups.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]">
              No groups created. Create groups to target specific students with classwork.
            </p>
          ) : (
            <div className="space-y-3">
              {studentGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                        {group.groupName}
                      </h3>
                      <span className="text-xs text-slate-400 dark:text-[#8B92A5]">
                        ({group.members.length} students)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition cursor-pointer"
                      aria-label={`Delete group ${group.groupName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.members.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-[#8B92A5]"
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Create Group Modal ─── */}
      <Modal
        open={groupModalOpen}
        title="Create Student Group"
        onClose={() => {
          setGroupModalOpen(false);
          setNewGroupName("");
          setSelectedStudentIds(new Set());
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Group Name
            </label>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Project Team A"
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 focus:border-orange-500"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Select Students ({selectedStudentIds.size} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              {enrolledStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(student.id)}
                    onChange={() => toggleStudentSelection(student.id)}
                    className="rounded border-slate-300 dark:border-white/20 text-[#F97316]"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-[#F0F2F8]">{student.name}</span>
                  <span className="text-[11px] text-slate-400 dark:text-[#8B92A5]">{student.email}</span>
                </label>
              ))}
              {enrolledStudents.length === 0 && (
                <p className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 text-center">
                  No students enrolled yet
                </p>
              )}
            </div>
          </div>

          <Button theme={theme} onClick={handleCreateGroup} className="w-full">
            Create Group
          </Button>
        </div>
      </Modal>

      {/* ─── Private Comment Drawer ─── */}
      <PrivateCommentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        theme={theme}
        studentName={selectedStudent?.name || ""}
        studentId={selectedStudent?.id || ""}
        comments={comments}
        currentUserId={currentUserId}
        onSend={handleSendComment}
        sending={sendingComment}
      />

      {/* ─── MiniCard Popover ─── */}
      {miniCard && (
        <UserMiniCard
          userId={miniCard.userId}
          instituteCode={instituteCode}
          anchorRect={miniCard.anchorRect}
          onClose={() => setMiniCard(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
