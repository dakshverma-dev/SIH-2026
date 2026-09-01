import { z } from "zod";

export const FieldReportSchema = z.object({
  raw_text: z.string().trim().min(5, "Report text must be at least 5 characters."),
  contractor: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  shift: z.string().trim().max(60).optional().nullable(),
  discipline: z.string().trim().max(60).optional().nullable(),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "report_date must be YYYY-MM-DD").optional(),
});

export const MatchReviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  activityId: z.string().uuid().optional().nullable(),
});

export const ConflictActionSchema = z.object({
  action: z.enum(["RESOLVE", "IGNORE"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const RecoveryRequestSchema = z.object({
  activityId: z.string().uuid("activityId must be a valid UUID."),
});

export const NotificationActionSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ markAllRead: z.literal(true) }),
]);

export const UPLOAD_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
export const UPLOAD_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword",
  "application/vnd.ms-excel",
]);

/** Turns a ZodError into the {error, issues} shape every route already returns
 * (kept string-first so existing `data.error` frontend reads don't break). */
export function zodErrorResponse(error: z.ZodError) {
  return {
    error: error.issues[0]?.message || "Invalid request.",
    issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}
