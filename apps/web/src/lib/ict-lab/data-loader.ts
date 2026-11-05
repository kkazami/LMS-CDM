import { z } from "zod";
import rawHardwarePartsJson from "./data/hardware-parts.json";
import rawLanCableJson from "./data/lan-cable.json";
import type { HardwarePartsData, LanCableData } from "./types";

const hardwareCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const hardwarePartSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  function: z.string().min(1),
  description: z.string().min(1),
  connectsTo: z.array(z.string().min(1)),
});

const hardwarePartsDataSchema = z.object({
  categories: z.array(hardwareCategorySchema).min(1),
  parts: z.array(hardwarePartSchema).min(1),
});

const lanWireSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  pair: z.string().min(1),
  striped: z.boolean(),
});

const lanStandardPinSchema = z.object({
  pin: z.number().int().min(1).max(8),
  wire: z.string().min(1),
});

const lanStandardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pins: z.array(lanStandardPinSchema).length(8),
});

const lanCableTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  wiring: z.string().min(1),
  usedFor: z.string().min(1),
  testerPattern: z.array(z.tuple([z.number().int(), z.number().int()])).length(8),
});

const lanToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  use: z.string().min(1),
});

const lanCrimpingStepSchema = z.object({
  step: z.number().int().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
});

const lanFaultSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  meaning: z.string().min(1),
});

const lanCableDataSchema = z.object({
  palette: z.record(z.string(), z.string()),
  wires: z.array(lanWireSchema).length(8),
  standards: z.array(lanStandardSchema).min(2),
  pinOrientationNote: z.string().min(1),
  cableTypes: z.array(lanCableTypeSchema).min(2),
  facts: z.array(z.string().min(1)).min(1),
  tools: z.array(lanToolSchema).min(1),
  crimpingSteps: z.array(lanCrimpingStepSchema).min(1),
  faults: z.array(lanFaultSchema).min(1),
});

let cachedHardwareData: HardwarePartsData | null = null;
let cachedLanCableData: LanCableData | null = null;

/**
 * Bundled, Zod-validated loader for `apps/web/src/lib/ict-lab/data/hardware-parts.json`.
 */
export function loadHardwarePartsData(): HardwarePartsData {
  if (cachedHardwareData) return cachedHardwareData;
  const parsed = hardwarePartsDataSchema.parse(rawHardwarePartsJson);
  cachedHardwareData = parsed;
  return parsed;
}

/**
 * Bundled, Zod-validated loader for `apps/web/src/lib/ict-lab/data/lan-cable.json`.
 */
export function loadLanCableData(): LanCableData {
  if (cachedLanCableData) return cachedLanCableData;
  const parsed = lanCableDataSchema.parse(rawLanCableJson);
  cachedLanCableData = parsed;
  return parsed;
}
