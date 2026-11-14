import frameworksJson from "./data/frameworks.json";
import type { LessonPlanFramework, FrameworkId } from "./types";

export const FRAMEWORKS: readonly LessonPlanFramework[] =
  frameworksJson as unknown as LessonPlanFramework[];

export function getFrameworkById(id: string): LessonPlanFramework | undefined {
  return FRAMEWORKS.find((f) => f.id === id);
}

export function getDefaultFramework(): LessonPlanFramework {
  return FRAMEWORKS[0]!;
}

export function isValidFrameworkId(id: string): id is FrameworkId {
  return FRAMEWORKS.some((f) => f.id === id);
}

