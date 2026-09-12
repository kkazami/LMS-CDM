/**
 * apps/web/src/lib/harness/oversight/checkpoint-manager.ts
 *
 * Outer Ring: Human Oversight & Checkpoints
 * Prevents autonomous execution of high-stakes actions without human sign-off.
 */

import { OversightCheckpoint } from "../core/types";

class CheckpointManager {
  private checkpoints = new Map<string, OversightCheckpoint>();

  /**
   * Creates a pending checkpoint for high-stakes actions
   */
  requestHumanApproval(
    actionType: OversightCheckpoint["actionType"],
    proposedPayload: Record<string, any>,
    studentId: string
  ): OversightCheckpoint {
    const id = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const checkpoint: OversightCheckpoint = {
      id,
      actionType,
      status: "PENDING_APPROVAL",
      proposedPayload,
      studentId,
      createdAt: new Date(),
    };

    this.checkpoints.set(id, checkpoint);
    console.warn(`[HUMAN CHECKPOINT CREATED] Action: ${actionType}, Checkpoint ID: ${id}`);
    return checkpoint;
  }

  /**
   * Approves or rejects a pending checkpoint
   */
  resolveCheckpoint(id: string, reviewerId: string, approved: boolean): OversightCheckpoint | null {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return null;

    checkpoint.status = approved ? "APPROVED" : "REJECTED";
    checkpoint.reviewerId = reviewerId;
    return checkpoint;
  }

  /**
   * Lists pending checkpoints for a professor
   */
  getPendingCheckpoints(): OversightCheckpoint[] {
    return Array.from(this.checkpoints.values()).filter((c) => c.status === "PENDING_APPROVAL");
  }
}

export const checkpointManager = new CheckpointManager();
