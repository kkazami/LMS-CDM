import { z } from "zod";
import type { HardwarePart, LanCableType, LanFault } from "./types";

// ─── ITE Program Matchers (Reusable across BTLEd ICT, BECEd, BEEd, BSEd Science) ───

export type IteProgramKind = "BTLED_ICT" | "BECED" | "BEED" | "BSED_SCIENCE" | "GENERAL_EDUCATION";

function normalizeProgramString(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, " ");
}

/**
 * Matches whether a raw program code, program name, department, or course section
 * belongs to the BTLEd ICT program (`"BTLEd ICT"` / `"Bachelor of Technology and Livelihood Education Major in ICT"`).
 */
export function isBtledIctProgram(raw: string | null | undefined): boolean {
  const n = normalizeProgramString(raw);
  if (!n) return false;
  if (
    n === "BTLED ICT" ||
    n === "BTLED-ICT" ||
    n === "BTLED" ||
    n === "BTLED MAJOR IN ICT" ||
    n.startsWith("BTLED ICT ") ||
    n.startsWith("BTLED ")
  ) {
    return true;
  }
  if (
    n.includes("TECHNOLOGY AND LIVELIHOOD EDUCATION") &&
    (n.includes("ICT") || n.includes("INFORMATION AND COMMUNICATION"))
  ) {
    return true;
  }
  return false;
}

/**
 * Matches BECEd (`"BECEd"` / `"Bachelor of Early Childhood Education"`).
 */
export function isBecedProgram(raw: string | null | undefined): boolean {
  const n = normalizeProgramString(raw);
  if (!n) return false;
  return (
    n === "BECED" ||
    n.startsWith("BECED ") ||
    n.includes("EARLY CHILDHOOD EDUCATION")
  );
}

/**
 * Matches BEEd (`"BEEd"` / `"Bachelor of Elementary Education"`).
 */
export function isBeedProgram(raw: string | null | undefined): boolean {
  const n = normalizeProgramString(raw);
  if (!n) return false;
  return (
    n === "BEED" ||
    n.startsWith("BEED ") ||
    n.includes("ELEMENTARY EDUCATION")
  );
}

/**
 * Matches BSEd Science (`"BSEd SCIENCE"` / `"Bachelor of Secondary Education Major in Science"`).
 */
export function isBsedScienceProgram(raw: string | null | undefined): boolean {
  const n = normalizeProgramString(raw);
  if (!n) return false;
  return (
    n === "BSED SCIENCE" ||
    n === "BSED SCI" ||
    n === "BSED MAJOR IN SCIENCE" ||
    n.startsWith("BSED SCIENCE ") ||
    n.startsWith("BSED SCI ") ||
    (n.includes("SECONDARY EDUCATION") && n.includes("SCIENCE"))
  );
}

/**
 * Classifies any raw program string into a canonical ITE program kind, or null if unmatched.
 */
export function classifyIteProgram(raw: string | null | undefined): IteProgramKind | null {
  if (isBtledIctProgram(raw)) return "BTLED_ICT";
  if (isBecedProgram(raw)) return "BECED";
  if (isBeedProgram(raw)) return "BEED";
  if (isBsedScienceProgram(raw)) return "BSED_SCIENCE";
  const n = normalizeProgramString(raw);
  if (n === "GENERAL EDUCATION") return "GENERAL_EDUCATION";
  return null;
}

// ─── Code Playground Limits, Validation & Security Helpers ──────────────────

export const MAX_PLAYGROUND_BYTES = 100 * 1024; // 100 KB (102,400 bytes)
export const MAX_PLAYGROUND_PROJECTS_PER_STUDENT = 30;
export const MIN_PROJECT_TITLE_LENGTH = 1;
export const MAX_PROJECT_TITLE_LENGTH = 80;

export const PLAYGROUND_IFRAME_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; font-src data: https:;";

export const PLAYGROUND_POSTMESSAGE_SOURCE = "cdm-ict-playground";

export const ICT_PLAYGROUND_STORAGE_UNAVAILABLE_MESSAGE =
  "Saving projects is not available yet. Your code still runs, but it can't be saved.";

/**
 * Detects whether a database error thrown while querying `db.ictPlaygroundProject`
 * is caused by the `IctPlaygroundProject` table not existing yet (Prisma `P2021` or PostgreSQL `42P01`).
 */
export function isMissingPlaygroundTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as {
    code?: unknown;
    message?: unknown;
    meta?: {
      table?: unknown;
      modelName?: unknown;
      driverAdapterError?: {
        cause?: { originalCode?: unknown; originalMessage?: unknown };
      };
    };
    cause?: { code?: unknown; message?: unknown };
  };

  if (candidate.code === "P2021" || candidate.code === "42P01") {
    return true;
  }
  if (candidate.cause?.code === "P2021" || candidate.cause?.code === "42P01") {
    return true;
  }
  if (candidate.meta?.driverAdapterError?.cause?.originalCode === "42P01") {
    return true;
  }

  const msg = typeof candidate.message === "string" ? candidate.message : "";
  if (
    /\bP2021\b/.test(msg) ||
    /IctPlaygroundProject.*does not exist/i.test(msg) ||
    /relation\s+"?IctPlaygroundProject"?\s+does not exist/i.test(msg) ||
    /table\s+`?(?:public\.)?"?IctPlaygroundProject"?`?\s+does not exist/i.test(msg)
  ) {
    return true;
  }
  return false;
}

/**
 * Maps errors thrown in `/api/ite/ict-lab/projects` and `/api/ite/ict-lab/projects/[id]`
 * to an HTTP status and JSON body.
 * - Missing `IctPlaygroundProject` table (`P2021` / `42P01`) -> `503` with `ICT_PLAYGROUND_STORAGE_UNAVAILABLE_MESSAGE`.
 * - Known HTTP status errors (`HttpError`) -> `err.status` with `err.message`.
 * - `ZodError` -> `400` with validation issue message.
 * - Any other unexpected error -> `500` with `"Internal error."`.
 */
export function mapIctPlaygroundRouteError(err: unknown): {
  status: number;
  body: { error: string; message: string; storageUnavailable?: boolean };
} {
  if (isMissingPlaygroundTableError(err)) {
    return {
      status: 503,
      body: {
        error: ICT_PLAYGROUND_STORAGE_UNAVAILABLE_MESSAGE,
        message: ICT_PLAYGROUND_STORAGE_UNAVAILABLE_MESSAGE,
        storageUnavailable: true,
      },
    };
  }

  if (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { status?: unknown }).status === "number" &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    const statusErr = err as { status: number; message: string };
    return {
      status: statusErr.status,
      body: { error: statusErr.message, message: statusErr.message },
    };
  }

  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    const msg = `${where}${first?.message ?? "Invalid request."}`;
    return {
      status: 400,
      body: { error: msg, message: msg },
    };
  }

  return {
    status: 500,
    body: { error: "Internal error.", message: "Internal error." },
  };
}

const textEncoder = new TextEncoder();

export function computeProjectByteSize(html: string, css: string, js: string): number {
  return (
    textEncoder.encode(html).byteLength +
    textEncoder.encode(css).byteLength +
    textEncoder.encode(js).byteLength
  );
}

export const playgroundProjectInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(MIN_PROJECT_TITLE_LENGTH, "Project title must be between 1 and 80 characters.")
      .max(MAX_PROJECT_TITLE_LENGTH, "Project title must be at most 80 characters."),
    html: z.string().default(""),
    css: z.string().default(""),
    js: z.string().default(""),
  })
  .superRefine((val, ctx) => {
    const totalBytes = computeProjectByteSize(val.html, val.css, val.js);
    if (totalBytes > MAX_PLAYGROUND_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Project code size (${totalBytes.toLocaleString()} bytes) exceeds the 100 KB (${MAX_PLAYGROUND_BYTES.toLocaleString()} bytes) limit.`,
        path: ["html"],
      });
    }
  });

export type PlaygroundProjectInput = z.infer<typeof playgroundProjectInputSchema>;

export function validatePlaygroundProjectInput(
  raw: unknown
): { ok: true; data: PlaygroundProjectInput; byteSize: number } | { ok: false; reason: string } {
  const parsed = playgroundProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, reason: firstIssue?.message || "Invalid project payload." };
  }
  const byteSize = computeProjectByteSize(parsed.data.html, parsed.data.css, parsed.data.js);
  return { ok: true, data: parsed.data, byteSize };
}

export function checkProjectCountLimit(
  currentCount: number
): { ok: true } | { ok: false; reason: string } {
  if (currentCount >= MAX_PLAYGROUND_PROJECTS_PER_STUDENT) {
    return {
      ok: false,
      reason: `You have reached the maximum of ${MAX_PLAYGROUND_PROJECTS_PER_STUDENT} saved projects. Delete an existing project before creating a new one.`,
    };
  }
  return { ok: true };
}

export function checkProjectOwnership(projectUserId: string, callerUserId: string): boolean {
  if (!projectUserId || !callerUserId) return false;
  return projectUserId === callerUserId;
}

export interface PlaygroundConsoleEntry {
  level: "log" | "warn" | "error" | "info";
  text: string;
  timestamp: number;
}

/**
 * Validates a `window` message event from the sandboxed preview iframe (`sandbox="allow-scripts"`).
 * - Requires `expectedContentWindow` to be present and `event.source === expectedContentWindow`.
 * - Because the iframe uses `sandbox="allow-scripts"` without `allow-same-origin`, its origin is
 *   opaque and serialized by browsers as the string `"null"`. Rejects any event whose `origin`
 *   is a non-`"null"` string.
 * - Converts all arguments to plain text strings so nothing is ever rendered as HTML.
 */
export function validatePreviewMessageEvent(
  event: { source: unknown; origin?: unknown; data: unknown },
  expectedContentWindow: unknown
): PlaygroundConsoleEntry | null {
  if (!expectedContentWindow || event.source !== expectedContentWindow) {
    return null;
  }
  if (
    event.origin !== undefined &&
    event.origin !== "null" &&
    event.origin !== null &&
    event.origin !== ""
  ) {
    return null;
  }
  if (!event.data || typeof event.data !== "object") {
    return null;
  }
  const payload = event.data as Record<string, unknown>;
  if (payload.source !== PLAYGROUND_POSTMESSAGE_SOURCE) {
    return null;
  }
  const level = payload.level;
  if (level !== "log" && level !== "warn" && level !== "error" && level !== "info") {
    return null;
  }
  const rawArgs = Array.isArray(payload.args) ? payload.args : [];
  const safeParts = rawArgs.slice(0, 50).map((item) => {
    if (typeof item === "string") return item.slice(0, 4000);
    try {
      return JSON.stringify(item).slice(0, 4000);
    } catch {
      return String(item).slice(0, 4000);
    }
  });
  const text = safeParts.join(" ");
  const timestamp =
    typeof payload.timestamp === "number" && Number.isFinite(payload.timestamp)
      ? payload.timestamp
      : Date.now();
  return { level, text, timestamp };
}

/**
 * Escapes `</script` or `</style` inside student CSS/JS before embedding in `srcdoc`.
 */
function escapeClosingTag(code: string, tagName: "style" | "script"): string {
  const regex = new RegExp(`<\\/${tagName}`, "gi");
  return code.replace(regex, `<\\/${tagName}`);
}

/**
 * Builds the sandboxed `<iframe srcdoc="...">` HTML document with:
 * - Restrictive `<meta http-equiv="Content-Security-Policy" ...>`
 * - Console bridge script injected in `<head>` BEFORE any student HTML or JS scripts
 * - Captures `console.log`, `console.info`, `console.warn`, `console.error`, and uncaught
 *   runtime errors (both synchronous exceptions and `window` `error` / `unhandledrejection` events)
 *   and posts them to `parent.postMessage`.
 */
export function buildPlaygroundSrcdoc(
  html: string,
  css: string,
  js: string,
  runId = 0,
  nonce?: string
): string {
  const safeCss = escapeClosingTag(css, "style");
  const safeJs = escapeClosingTag(js, "script");
  const cleanNonce = nonce?.trim() || "";
  const nonceAttr = cleanNonce ? ` nonce="${cleanNonce}"` : "";
  const iframeCsp = cleanNonce
    ? `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'nonce-${cleanNonce}'; img-src data: https:; font-src data: https:;`
    : PLAYGROUND_IFRAME_CSP;

  const bridgeScript = `
(function() {
  var SOURCE = "${PLAYGROUND_POSTMESSAGE_SOURCE}";
  var lastReportedError = null;
  function formatArg(val) {
    if (val === undefined) return "undefined";
    if (val === null) return "null";
    if (typeof val === "string") return val;
    if (val instanceof Error || (val && typeof val === "object" && (val.name || val.message))) {
      var name = val.name || "Error";
      var message = val.message || "";
      return message.indexOf(name) === 0 ? message : name + ": " + message;
    }
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  }
  function send(level, argsLike) {
    try {
      var arr = [];
      for (var i = 0; i < argsLike.length; i++) {
        arr.push(formatArg(argsLike[i]));
      }
      parent.postMessage({
        source: SOURCE,
        level: level,
        args: arr,
        timestamp: Date.now()
      }, "*");
    } catch (e) {}
  }
  window.__cdmReportError = function(err) {
    lastReportedError = err;
    var formatted = formatArg(err);
    if (formatted.indexOf("Uncaught ") !== 0) {
      formatted = "Uncaught " + formatted;
    }
    send("error", [formatted]);
  };
  var origLog = console.log;
  var origInfo = console.info;
  var origWarn = console.warn;
  var origError = console.error;
  console.log = function() { send("log", arguments); if (origLog) origLog.apply(console, arguments); };
  console.info = function() { send("info", arguments); if (origInfo) origInfo.apply(console, arguments); };
  console.warn = function() { send("warn", arguments); if (origWarn) origWarn.apply(console, arguments); };
  console.error = function() { send("error", arguments); if (origError) origError.apply(console, arguments); };
  window.addEventListener("error", function(ev) {
    if (ev && ev.error && ev.error === lastReportedError) {
      lastReportedError = null;
      return;
    }
    var msg = "";
    if (ev && ev.error) {
      msg = formatArg(ev.error);
      if (msg.indexOf("Uncaught ") !== 0) msg = "Uncaught " + msg;
    } else if (ev && ev.message) {
      msg = ev.message;
    } else {
      msg = "Uncaught runtime error";
    }
    if (ev && typeof ev.lineno === "number" && ev.lineno > 0) {
      msg += " (line " + ev.lineno + ")";
    }
    send("error", [msg]);
  });
  window.addEventListener("unhandledrejection", function(ev) {
    var reason = ev && ev.reason ? formatArg(ev.reason) : "Unhandled promise rejection";
    send("error", ["Uncaught (in promise): " + reason]);
  });
})();
`.trim();

  return `<!DOCTYPE html>
<!-- cdm-run:${runId} -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="${iframeCsp}" />
<style>
${safeCss}
</style>
<script${nonceAttr}>
${bridgeScript}
</script>
</head>
<body>
${html}
<script${nonceAttr}>
try {
${safeJs}
} catch (__err) {
  if (typeof window.__cdmReportError === "function") {
    window.__cdmReportError(__err);
  } else {
    console.error(__err);
  }
}
</script>
</body>
</html>`;
}

// ─── Hardware Explorer Verification & Quiz Generation ───────────────────────

/**
 * Verifies that every part ID from `hardware-parts.json` has a corresponding SVG drawing.
 * Throws a descriptive error if any part in the JSON has no SVG drawing.
 */
export function assertAllHardwarePartsHaveSvgDrawing(
  parts: readonly HardwarePart[],
  drawnPartIds: Iterable<string>
): void {
  const drawnSet = new Set(drawnPartIds);
  const missing = parts.filter((p) => !drawnSet.has(p.id)).map((p) => p.id);
  if (missing.length > 0) {
    throw new Error(
      `[HardwareExplorer] Missing SVG drawing for hardware-parts.json part id(s): ${missing.join(", ")}`
    );
  }
}

export type HardwareQuizMode = "CLICK_THE_PART" | "NAME_THE_PART";

export interface HardwareQuizQuestion {
  index: number;
  partId: string;
  partName: string;
  partFunction: string;
  partCategory: string;
  options: string[]; // 4 part names for NAME_THE_PART; empty for CLICK_THE_PART
}

function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Generates a 10-question round strictly from `hardware-parts.json`.
 */
export function generateHardwareQuizQuestions(
  parts: readonly HardwarePart[],
  mode: HardwareQuizMode,
  count = 10,
  rng: () => number = Math.random
): HardwareQuizQuestion[] {
  if (parts.length === 0) return [];
  const shuffledParts = shuffleArray(parts, rng);
  const selected: HardwarePart[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(shuffledParts[i % shuffledParts.length]!);
  }

  return selected.map((target, index) => {
    let options: string[] = [];
    if (mode === "NAME_THE_PART") {
      const distractors = shuffleArray(
        parts.filter((p) => p.id !== target.id).map((p) => p.name),
        rng
      ).slice(0, 3);
      options = shuffleArray([target.name, ...distractors], rng);
    }
    return {
      index,
      partId: target.id,
      partName: target.name,
      partFunction: target.function,
      partCategory: target.category,
      options,
    };
  });
}

// ─── LAN Cable Tester Simulation & Classification ───────────────────────────

export type CableTesterResultKind =
  | "straight-through"
  | "crossover"
  | "open"
  | "short"
  | "miswire";

export interface CableTesterPinStep {
  pinA: number;
  wireA: string | null;
  ledsA: number[];
  ledsB: number[];
  mappingLabel: string;
  status: "ok" | "open" | "short";
}

export interface CableTesterSimulationResult {
  classification: CableTesterResultKind;
  matchedCableType: LanCableType | null;
  matchedFault: LanFault | null;
  steps: CableTesterPinStep[];
  wrongPins: { pinA: number; actualPinB: number | null; reason: string }[];
  openPins: number[];
  shortedPins: [number, number] | null;
}

function patternsMatch(
  actualPairs: readonly [number, number][],
  expectedPattern: readonly [number, number][]
): boolean {
  if (actualPairs.length !== expectedPattern.length) return false;
  return expectedPattern.every(([pinA, pinB]) => {
    const found = actualPairs.find(([a]) => a === pinA);
    return found !== undefined && found[1] === pinB;
  });
}

/**
 * Computes from the actual wire identity at each pin (1–8) on End A which pin(s) on End B
 * each End A pin reaches, simulates the 8 sequential LED steps, and classifies the cable
 * using `cableTypes` and `faults` from `apps/web/src/lib/ict-lab/data/lan-cable.json`.
 */
export function simulateCableTester(params: {
  endAPins: readonly (string | null)[];
  endBPins: readonly (string | null)[];
  openPins?: readonly number[];
  shortedPinPair?: readonly [number, number] | null;
  cableTypes: readonly LanCableType[];
  faults: readonly LanFault[];
}): CableTesterSimulationResult {
  const {
    endAPins,
    endBPins,
    openPins = [],
    shortedPinPair = null,
    cableTypes,
    faults,
  } = params;

  const openPinSet = new Set(openPins);
  const steps: CableTesterPinStep[] = [];
  const discoveredPairs: [number, number][] = [];
  const wrongPins: { pinA: number; actualPinB: number | null; reason: string }[] = [];
  const detectedOpenPins: number[] = [];

  for (let idx = 0; idx < 8; idx++) {
    const pinA = idx + 1;
    const wireA = endAPins[idx] ?? null;
    const isSimulatedOpen = openPinSet.has(pinA);

    if (!wireA || isSimulatedOpen) {
      detectedOpenPins.push(pinA);
      wrongPins.push({
        pinA,
        actualPinB: null,
        reason: `Pin ${pinA} has no continuity (open contact).`,
      });
      steps.push({
        pinA,
        wireA,
        ledsA: [],
        ledsB: [],
        mappingLabel: `${pinA}-OPEN`,
        status: "open",
      });
      continue;
    }

    // Find which pin(s) on End B carry the same wire (and are not open)
    const matchingPinsB: number[] = [];
    for (let bIdx = 0; bIdx < 8; bIdx++) {
      const pinB = bIdx + 1;
      if (endBPins[bIdx] === wireA && !openPinSet.has(pinB)) {
        matchingPinsB.push(pinB);
      }
    }

    if (matchingPinsB.length === 0) {
      detectedOpenPins.push(pinA);
      wrongPins.push({
        pinA,
        actualPinB: null,
        reason: `Wire "${wireA}" at End A Pin ${pinA} is not connected on End B.`,
      });
      steps.push({
        pinA,
        wireA,
        ledsA: [pinA],
        ledsB: [],
        mappingLabel: `${pinA}-OPEN`,
        status: "open",
      });
      continue;
    }

    // Check if this pin is part of a simulated short between two wires
    const isShorted =
      shortedPinPair !== null &&
      (shortedPinPair[0] === pinA || shortedPinPair[1] === pinA);

    if (isShorted && shortedPinPair) {
      const otherPinA = shortedPinPair[0] === pinA ? shortedPinPair[1] : shortedPinPair[0];
      const otherWireA = endAPins[otherPinA - 1] ?? null;
      const shortedPinsB = new Set<number>(matchingPinsB);
      if (otherWireA && !openPinSet.has(otherPinA)) {
        for (let bIdx = 0; bIdx < 8; bIdx++) {
          const pinB = bIdx + 1;
          if (endBPins[bIdx] === otherWireA && !openPinSet.has(pinB)) {
            shortedPinsB.add(pinB);
          }
        }
      }
      const ledsA = [pinA, otherPinA].sort((a, b) => a - b);
      const ledsB = Array.from(shortedPinsB).sort((a, b) => a - b);
      steps.push({
        pinA,
        wireA,
        ledsA,
        ledsB,
        mappingLabel: `${pinA}-${ledsB.join("&")} (SHORT)`,
        status: "short",
      });
      wrongPins.push({
        pinA,
        actualPinB: matchingPinsB[0] ?? null,
        reason: `Pin ${ledsA[0]} and Pin ${ledsA[1]} are shorted together (two LEDs light at once).`,
      });
      continue;
    }

    const primaryPinB = matchingPinsB[0]!;
    discoveredPairs.push([pinA, primaryPinB]);
    steps.push({
      pinA,
      wireA,
      ledsA: [pinA],
      ledsB: matchingPinsB,
      mappingLabel: `${pinA}-${primaryPinB}`,
      status: "ok",
    });
  }

  // Classify result
  if (shortedPinPair !== null) {
    const shortFault = faults.find((f) => f.id === "short") ?? null;
    return {
      classification: "short",
      matchedCableType: null,
      matchedFault: shortFault,
      steps,
      wrongPins,
      openPins: detectedOpenPins,
      shortedPins: [shortedPinPair[0], shortedPinPair[1]],
    };
  }

  if (detectedOpenPins.length > 0) {
    const openFault = faults.find((f) => f.id === "open") ?? null;
    return {
      classification: "open",
      matchedCableType: null,
      matchedFault: openFault,
      steps,
      wrongPins,
      openPins: detectedOpenPins,
      shortedPins: null,
    };
  }

  const straightType = cableTypes.find((c) => c.id === "straight-through") ?? null;
  if (straightType && patternsMatch(discoveredPairs, straightType.testerPattern)) {
    return {
      classification: "straight-through",
      matchedCableType: straightType,
      matchedFault: null,
      steps,
      wrongPins: [],
      openPins: [],
      shortedPins: null,
    };
  }

  const crossoverType = cableTypes.find((c) => c.id === "crossover") ?? null;
  if (crossoverType && patternsMatch(discoveredPairs, crossoverType.testerPattern)) {
    return {
      classification: "crossover",
      matchedCableType: crossoverType,
      matchedFault: null,
      steps,
      wrongPins: [],
      openPins: [],
      shortedPins: null,
    };
  }

  // Otherwise it is a miswire: compare against straight-through (or crossover if closer) to list wrong pins
  const miswireFault = faults.find((f) => f.id === "miswire") ?? null;
  const miswirePins: { pinA: number; actualPinB: number | null; reason: string }[] = [];

  for (const [pinA, pinB] of discoveredPairs) {
    if (pinA !== pinB) {
      miswirePins.push({
        pinA,
        actualPinB: pinB,
        reason: `End A Pin ${pinA} reaches End B Pin ${pinB} (expected Pin ${pinA} for straight-through).`,
      });
    }
  }

  // If all pins matched 1-1 it would have matched straight-through above; fallback if custom pattern
  if (miswirePins.length === 0) {
    for (const [pinA, pinB] of discoveredPairs) {
      miswirePins.push({
        pinA,
        actualPinB: pinB,
        reason: `End A Pin ${pinA} mapped to End B Pin ${pinB}.`,
      });
    }
  }

  return {
    classification: "miswire",
    matchedCableType: null,
    matchedFault: miswireFault,
    steps,
    wrongPins: miswirePins,
    openPins: [],
    shortedPins: null,
  };
}
