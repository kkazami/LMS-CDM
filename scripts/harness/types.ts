export const VERSION = 2;
export const MAX_REPAIRS = 5;
export const STAGES = ['requirements', 'recon', 'red-team', 'adjudication', 'plan', 'implementation', 'tests', 'validation', 'qa', 'security', 'code-review', 'release', 'deployment', 'post-deploy'] as const;
export type Stage = typeof STAGES[number];
export const ROLES = ['requirement', 'recon', 'architecture-red-team', 'architecture-adjudicator', 'planner', 'executor', 'test', 'runner', 'qa', 'security', 'code-review', 'release', 'deployer'] as const;
export type Role = typeof ROLES[number];
export const OWNERS: Record<Stage, Role> = {
  requirements: 'requirement', recon: 'recon', 'red-team': 'architecture-red-team', adjudication: 'architecture-adjudicator', plan: 'planner', implementation: 'executor', tests: 'test', validation: 'runner', qa: 'qa', security: 'security', 'code-review': 'code-review', release: 'release', deployment: 'deployer', 'post-deploy': 'runner',
};
export const STATES: Record<Stage, string> = {
  requirements: 'REQUIREMENTS_READY', recon: 'RECON_COMPLETE', 'red-team': 'RED_TEAM_COMPLETE', adjudication: 'ARCHITECTURE_ADJUDICATED', plan: 'PLAN_READY', implementation: 'IMPLEMENTED', tests: 'TESTS_READY', validation: 'VALIDATED', qa: 'QA_VERIFIED', security: 'SECURITY_VERIFIED', 'code-review': 'CODE_REVIEWED', release: 'RELEASE_READY', deployment: 'DEPLOYED', 'post-deploy': 'COMPLETE',
};
export type Risk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface Snapshot { head: string; index: string; digest: string; files: Record<string, string> }
export interface Input {
  prompt: string; profile: 'frontend' | 'api' | 'database' | 'fullstack' | 'mobile' | 'desktop' | 'bugfix' | 'refactor' | 'harness';
  quality: 'standard' | 'strict' | 'maximum'; deployment: boolean; operations: string[];
  actors: Record<Role, string>;
  actorCapabilities: Record<Role, string>;
  agentProvider?: 'codex';
}
export interface Envelope {
  version: number; runId: string; stage: Stage; attempt: number; actor: string; createdAt: string;
  snapshot: Snapshot; dependencies: Record<string, string>; data: unknown; diff?: { path: string; hash: string; snapshot: string };
  session?: { path: string; hash: string; id: string; source: string };
}
export interface ArtifactRef { path: string; hash: string; envelope: Envelope }
export interface CommandSpec {
  id: string; program: 'node' | 'pnpm'; args: string[];
  domain: 'static' | 'runtime' | 'browser' | 'security' | 'database' | 'deployment' | 'post-deploy';
  criteria: string[]; coverage: string[]; tests: string[]; timeoutMs: number;
}
export interface CommandEvidence {
  id: string; commandId: string; runId: string; attempt: number; stage: Stage;
  snapshot: Pick<Snapshot, 'head' | 'index' | 'digest'>; planHash: string; startedAt: string; finishedAt?: string;
  environment: string; argv: string[]; exitCode?: number | null; signal?: string | null;
  error?: string; output?: string; outputHash?: string; result?: string; resultHash?: string;
  outputs?: Record<string, string>;
  deployment?: { target: string; idempotencyKey: string };
  status: 'RUNNING' | 'PASS' | 'FAIL' | 'INTERRUPTED';
}
export interface ApprovalPayload {
  version: number; runId: string; purpose: 'implementation' | 'deployment' | 'architecture';
  subject: string; risk: Risk; human: string; issuedAt: string; expiresAt: string;
}
export interface Approval { payload: ApprovalPayload; signature: string }
export interface Failure { attempt: number; stage: Stage; signature: string; reasons: string[]; at: string; risk?: Risk; snapshot?: Snapshot }
export interface Claim { stage: Stage; actor: string; tokenHash: string; startedAt: string; expiresAt: string; snapshot: Snapshot; diff?: { path: string; hash: string; snapshot: string } }
export interface Run {
  version: number; runId: string; createdAt: string; input: Input; baseline: Snapshot;
  state: string; next: Stage | null; attempt: number; repairCount: number; risk: Risk;
  artifacts: Partial<Record<Stage, ArtifactRef>>; commands: CommandEvidence[];
  approvals: Approval[]; failures: Failure[]; history: ArtifactRef[]; claim: Claim | null;
  resumeNext: Stage | null; deploymentUncertain: boolean;
  approvalKeyHash?: string | null;
  expectedSnapshot?: Snapshot;
}
export type Event =
  | { type: 'INIT'; run: Run }
  | { type: 'CLAIM'; claim: Claim }
  | { type: 'SUBMIT'; artifact: ArtifactRef; risk: Risk }
  | { type: 'COMMAND_STARTED'; evidence: CommandEvidence }
  | { type: 'COMMAND_FINISHED'; evidence: CommandEvidence }
  | { type: 'APPROVE'; approval: Approval }
  | { type: 'FAIL'; failure: Failure }
  | { type: 'REPAIR'; snapshot: Snapshot }
  | { type: 'INTERRUPT'; reason: string }
  | { type: 'RESUME'; snapshot: Snapshot; deploymentReconciled: boolean }
  | { type: 'INVALIDATE'; next: Stage; reason: string; snapshot: Snapshot }
  | { type: 'ESCALATE'; reason: string; snapshot: Snapshot; risk: Risk };
