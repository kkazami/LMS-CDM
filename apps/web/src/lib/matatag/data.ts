import rawData from "./data/matatag-guides.json";
import type { MatatagData, MatatagDocument, MatatagSourcePage } from "./types";

export const MATATAG_DATA: MatatagData = rawData as MatatagData;

export function getMatatagData(): MatatagData {
  return MATATAG_DATA;
}

export function getMatatagDocuments(): MatatagDocument[] {
  return MATATAG_DATA.documents;
}

export function getMatatagSourcePages(): MatatagSourcePage[] {
  return MATATAG_DATA.sourcePages;
}

