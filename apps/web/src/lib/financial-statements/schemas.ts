import { z } from "zod";
import { STATEMENT_TYPES } from "./types";

/** Runtime validation at the API boundary. Deep sanitising happens in normalizeData(). */

const rowSchema = z.object({
  id: z.string().max(80),
  key: z.string().max(80).optional(),
  values: z.record(z.string().max(40), z.string().max(1000)),
});

export const statementDataSchema = z.object({
  meta: z.object({
    businessName: z.string().max(1000),
    periodStart: z.string().max(40),
    periodEnd: z.string().max(40),
    asOfDate: z.string().max(40),
    notes: z.string().max(20000),
    options: z.record(z.string().max(60), z.string().max(200)),
  }),
  sections: z.record(z.string().max(60), z.array(rowSchema).max(500)),
});

export const createStatementSchema = z.object({
  statementType: z.enum(STATEMENT_TYPES),
});

export const saveStatementSchema = z.object({
  data: statementDataSchema,
});

export const generateStatementSchema = z.object({
  data: statementDataSchema.optional(),
});
