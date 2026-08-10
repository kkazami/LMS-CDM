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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Instructor
        </h2>
        {instructor ? (
          <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4">
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
                <span className="text-sm font-semibold text-gray-900">
                  {instructor.name}
                </span>
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-xs text-gray-500">{instructor.email}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No instructor assigned</p>
        )}
      </section>

      {/* ─── Pending Requests ─── */}
      {canManage && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Pending Requests
              <Badge theme={theme}>
                <span className="ml-1">{pendingRequests.length}</span>
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
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={req.name}
                    avatarUrl={req.avatarUrl}
                    size="sm"
                    color="#F59E0B" // amber-500
                    onClick={(e: React.MouseEvent) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMiniCard({ userId: req.id, anchorRect: rect });
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {req.name}
                    </p>
                    <p className="text-xs text-gray-500">{req.email}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(req.enrollmentId)}
                    className="rounded-md bg-green-600 p-1.5 text-white hover:bg-green-700 transition"
                    aria-label="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDecline(req.enrollmentId)}
                    className="rounded-md bg-red-500 p-1.5 text-white hover:bg-red-600 transition"
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Students ({enrolledStudents.length})
        </h2>
        {enrolledStudents.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No students enrolled yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
            {enrolledStudents.map((student, i) => (
              <div
                key={student.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < enrolledStudents.length - 1
                    ? "border-b border-gray-200"
                    : ""
                }`}
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
                    <p className="text-sm font-medium text-gray-900">
                      {student.name}
                    </p>
                    <p className="text-xs text-gray-500">{student.email}</p>
                  </div>
                </div>

                {canManage && (
                  <button
                    onClick={() => openCommentDrawer(student)}
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
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
            <p className="text-sm text-gray-400 py-4 text-center">
              No groups created. Create groups to target specific students with
              classwork.
            </p>
          ) : (
            <div className="space-y-3">
              {studentGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-lg border border-gray-300 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        {group.groupName}
                      </h3>
                      <span className="text-xs text-gray-400">
                        ({group.members.length} students)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                      aria-label={`Delete group ${group.groupName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.members.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
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
            <label className="text-sm font-medium text-gray-800">
              Group Name
            </label>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Project Team A"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400"
              style={{ borderColor: theme.colors.border }}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-800">
              Select Students ({selectedStudentIds.size} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 divide-y divide-gray-100">
              {enrolledStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(student.id)}
                    onChange={() => toggleStudentSelection(student.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{student.name}</span>
                  <span className="text-xs text-gray-400">{student.email}</span>
                </label>
              ))}
              {enrolledStudents.length === 0 && (
                <p className="px-3 py-4 text-sm text-gray-400 text-center">
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
