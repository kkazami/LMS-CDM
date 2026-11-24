import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpError } from "../http";
import { canDeletePlacement, formatPlacementDeletionSummary } from "../rules";
import { executeDeletePlacement as deletePlacement, type DeletePlacementTx } from "../delete-placement";
import type { PracticumActor } from "../guard";

interface MockPlacementRecord {
  id: string;
  studentId: string;
  supervisorId: string;
  schoolName: string;
  subject: string;
  gradeLevel: string;
  schoolYear: string;
  rubricStorageKey: string | null;
}

interface MockSubmissionRecord {
  id: string;
  placementId: string;
  type: "LESSON_PLAN" | "PORTFOLIO_EVIDENCE" | "DEMO_VIDEO";
  fileUrl: string | null;
  videoLink: string | null;
}

interface MockFeedbackRecord {
  id: string;
  submissionId: string;
  comment: string;
}

function createMockStore() {
  const placements = new Map<string, MockPlacementRecord>([
    [
      "pl-1",
      {
        id: "pl-1",
        studentId: "student-1",
        supervisorId: "sup-1",
        schoolName: "Rizal High School",
        subject: "Science",
        gradeLevel: "Grade 8",
        schoolYear: "2026-2027",
        rubricStorageKey: "asset-rubric-1",
      },
    ],
  ]);

  const submissions = new Map<string, MockSubmissionRecord>([
    [
      "sub-lp-file",
      {
        id: "sub-lp-file",
        placementId: "pl-1",
        type: "LESSON_PLAN",
        fileUrl: "https://store.public.blob.vercel-storage.com/practicum/pl-1/plan.pdf",
        videoLink: null,
      },
    ],
    [
      "sub-pe-file",
      {
        id: "sub-pe-file",
        placementId: "pl-1",
        type: "PORTFOLIO_EVIDENCE",
        fileUrl: "https://store.public.blob.vercel-storage.com/practicum/pl-1/evidence.png",
        videoLink: null,
      },
    ],
    [
      "sub-dv-link",
      {
        id: "sub-dv-link",
        placementId: "pl-1",
        type: "DEMO_VIDEO",
        fileUrl: null,
        videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    ],
  ]);

  const feedback = new Map<string, MockFeedbackRecord>([
    ["fb-1", { id: "fb-1", submissionId: "sub-lp-file", comment: "Good plan" }],
    ["fb-2", { id: "fb-2", submissionId: "sub-lp-file", comment: "Minor edit" }],
    ["fb-3", { id: "fb-3", submissionId: "sub-dv-link", comment: "Clear delivery" }],
  ]);

  const privateAssets = new Set<string>(["asset-rubric-1"]);
  const auditLogs: Array<{
    adminId: string;
    targetId: string;
    action: string;
    ipAddress: string;
    metadata: string;
  }> = [];

  async function runTransaction<T>(fn: (tx: DeletePlacementTx) => Promise<T>): Promise<T> {
    const tx: DeletePlacementTx = {
      practicumPlacement: {
        findUnique: async ({ where }) => {
          const p = placements.get(where.id);
          if (!p) return null;
          const pSubs = Array.from(submissions.values())
            .filter((s) => s.placementId === p.id)
            .map((s) => ({
              id: s.id,
              type: s.type,
              fileUrl: s.fileUrl,
              _count: {
                feedback: Array.from(feedback.values()).filter((f) => f.submissionId === s.id).length,
              },
            }));
          return { ...p, submissions: pSubs };
        },
        deleteMany: async ({ where }) => {
          if (!placements.has(where.id)) return { count: 0 };
          placements.delete(where.id);
          // Simulate PostgreSQL ON DELETE CASCADE for submissions and feedback
          for (const [subId, sub] of submissions.entries()) {
            if (sub.placementId === where.id) {
              submissions.delete(subId);
              for (const [fbId, fb] of feedback.entries()) {
                if (fb.submissionId === subId) feedback.delete(fbId);
              }
            }
          }
          return { count: 1 };
        },
      },
      privateAsset: {
        deleteMany: async ({ where }) => {
          if (!privateAssets.has(where.id)) return { count: 0 };
          privateAssets.delete(where.id);
          return { count: 1 };
        },
      },
      auditLog: {
        create: async ({ data }) => {
          auditLogs.push(data);
          return data;
        },
      },
    };
    return fn(tx);
  }

  return { placements, submissions, feedback, privateAssets, auditLogs, runTransaction };
}

const supervisorOwner: PracticumActor = {
  userId: "sup-1",
  role: "INSTRUCTOR",
  instituteId: "ite",
  name: "Prof. Santos",
};

const otherSupervisor: PracticumActor = {
  userId: "sup-2",
  role: "INSTRUCTOR",
  instituteId: "ite",
  name: "Prof. Reyes",
};

const studentActor: PracticumActor = {
  userId: "student-1",
  role: "STUDENT",
  instituteId: "ite",
  name: "Maria Clara",
};

const adminActor: PracticumActor = {
  userId: "admin-1",
  role: "ADMIN",
  instituteId: "ite",
  name: "ITE Admin",
};

describe("canDeletePlacement & formatPlacementDeletionSummary", () => {
  it("allows owning supervisor and ITE admin, denies other supervisors, students, and non-ITE", () => {
    assert.equal(canDeletePlacement({ id: "sup-1", role: "INSTRUCTOR", isIte: true }, { supervisorId: "sup-1" }), true);
    assert.equal(canDeletePlacement({ id: "admin-1", role: "ADMIN", isIte: true }, { supervisorId: "sup-1" }), true);
    assert.equal(canDeletePlacement({ id: "sup-2", role: "INSTRUCTOR", isIte: true }, { supervisorId: "sup-1" }), false);
    assert.equal(canDeletePlacement({ id: "student-1", role: "STUDENT", isIte: true }, { supervisorId: "sup-1" }), false);
    assert.equal(canDeletePlacement({ id: "admin-1", role: "ADMIN", isIte: false }, { supervisorId: "sup-1" }), false);
  });

  it("formats real deletion counts clearly", () => {
    assert.equal(
      formatPlacementDeletionSummary({
        lessonPlans: 2,
        portfolioEvidence: 1,
        demoVideos: 1,
        comments: 3,
        hasRubric: true,
      }),
      "This will permanently delete 2 lesson plans, 1 portfolio evidence, 1 demo video, 3 comments and the rubric."
    );
    assert.equal(
      formatPlacementDeletionSummary({
        lessonPlans: 0,
        portfolioEvidence: 0,
        demoVideos: 0,
        comments: 0,
        hasRubric: false,
      }),
      "This placement has no submissions, comments, or rubric."
    );
  });
});

describe("deletePlacement service", () => {
  it("supervisor owner can delete placement, cascading submissions/comments, rubric asset, audit log, and only file-backed Blobs", async () => {
    const store = createMockStore();
    const deletedBlobUrls: string[][] = [];

    const result = await deletePlacement({
      placementId: "pl-1",
      actor: supervisorOwner,
      ipAddress: "203.0.113.10",
      deps: {
        runTransaction: store.runTransaction,
        uploadsConfigured: () => true,
        deleteBlobs: async (urls) => {
          deletedBlobUrls.push(urls);
        },
      },
    });

    assert.equal(result.placementId, "pl-1");
    assert.equal(result.deletedSubmissions, 3);
    assert.equal(result.deletedComments, 3);
    assert.equal(result.deletedRubric, true);
    assert.equal(result.blobFilesAttempted, 2);
    assert.equal(result.blobDeleteFailed, false);

    assert.equal(store.placements.size, 0);
    assert.equal(store.submissions.size, 0);
    assert.equal(store.feedback.size, 0);
    assert.equal(store.privateAssets.size, 0);
    assert.equal(store.auditLogs.length, 1);
    assert.equal(store.auditLogs[0].action, "PRACTICUM_PLACEMENT_DELETED");
    assert.equal(store.auditLogs[0].adminId, "sup-1");
    assert.equal(store.auditLogs[0].targetId, "student-1");

    // Only file-backed submissions are sent to Blob deletion, never link-only ones
    assert.deepEqual(deletedBlobUrls, [
      [
        "https://store.public.blob.vercel-storage.com/practicum/pl-1/plan.pdf",
        "https://store.public.blob.vercel-storage.com/practicum/pl-1/evidence.png",
      ],
    ]);

    // Second delete is idempotent and returns 404
    await assert.rejects(
      () =>
        deletePlacement({
          placementId: "pl-1",
          actor: supervisorOwner,
          deps: { runTransaction: store.runTransaction, uploadsConfigured: () => false, deleteBlobs: async () => {} },
        }),
      (err: unknown) => err instanceof HttpError && err.status === 404
    );
  });

  it("admin can delete any placement", async () => {
    const store = createMockStore();
    const result = await deletePlacement({
      placementId: "pl-1",
      actor: adminActor,
      deps: {
        runTransaction: store.runTransaction,
        uploadsConfigured: () => false,
        deleteBlobs: async () => {},
      },
    });
    assert.equal(result.placementId, "pl-1");
    assert.equal(store.placements.size, 0);
  });

  it("another supervisor cannot delete (403) and leaves DB untouched", async () => {
    const store = createMockStore();
    let blobCalled = false;

    await assert.rejects(
      () =>
        deletePlacement({
          placementId: "pl-1",
          actor: otherSupervisor,
          deps: {
            runTransaction: store.runTransaction,
            uploadsConfigured: () => true,
            deleteBlobs: async () => {
              blobCalled = true;
            },
          },
        }),
      (err: unknown) => err instanceof HttpError && err.status === 403
    );

    assert.equal(store.placements.size, 1);
    assert.equal(store.submissions.size, 3);
    assert.equal(store.feedback.size, 3);
    assert.equal(blobCalled, false);
  });

  it("student cannot delete (403) and leaves DB untouched", async () => {
    const store = createMockStore();
    await assert.rejects(
      () =>
        deletePlacement({
          placementId: "pl-1",
          actor: studentActor,
          deps: {
            runTransaction: store.runTransaction,
            uploadsConfigured: () => false,
            deleteBlobs: async () => {},
          },
        }),
      (err: unknown) => err instanceof HttpError && err.status === 403
    );
    assert.equal(store.placements.size, 1);
  });

  it("nonexistent placement returns 404", async () => {
    const store = createMockStore();
    await assert.rejects(
      () =>
        deletePlacement({
          placementId: "pl-does-not-exist",
          actor: supervisorOwner,
          deps: {
            runTransaction: store.runTransaction,
            uploadsConfigured: () => false,
            deleteBlobs: async () => {},
          },
        }),
      (err: unknown) => err instanceof HttpError && err.status === 404
    );
  });

  it("Blob deletion failure does not fail the request or leave DB half-deleted, and logs without leaking URLs", async () => {
    const store = createMockStore();
    const loggedCalls: unknown[][] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      loggedCalls.push(args);
    };

    try {
      const result = await deletePlacement({
        placementId: "pl-1",
        actor: supervisorOwner,
        deps: {
          runTransaction: store.runTransaction,
          uploadsConfigured: () => true,
          deleteBlobs: async () => {
            throw new Error("Blob timeout https://secret-url.example/token=abc");
          },
        },
      });

      assert.equal(result.placementId, "pl-1");
      assert.equal(result.blobFilesAttempted, 2);
      assert.equal(result.blobDeleteFailed, true);
      assert.equal(store.placements.size, 0);
      assert.equal(store.submissions.size, 0);
      assert.equal(store.feedback.size, 0);
      assert.equal(loggedCalls.length, 1);
      const serialized = JSON.stringify(loggedCalls[0]);
      assert.equal(serialized.includes("https://"), false);
      assert.equal(serialized.includes("token="), false);
    } finally {
      console.error = origError;
    }
  });
});
