import { z } from "zod";
import { VALID_TRANSITIONS } from "@/lib/constants";

/**
 * Schema for admin status update requests.
 * - status must be one of: under_review, accepted, rejected
 * - evaluatorComment is required (min 10 chars) when status = "rejected"
 * - evaluatorComment is optional for other statuses
 */
export const statusUpdateSchema = z
  .object({
    status: z.enum(["under_review", "accepted", "rejected"], {
      error: "Invalid status",
    }),
    evaluatorComment: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "rejected") {
        return (
          typeof data.evaluatorComment === "string" &&
          data.evaluatorComment.length >= 10
        );
      }
      return true;
    },
    {
      message: "Rejection comment must be at least 10 characters",
      path: ["evaluatorComment"],
    }
  );

export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;

/**
 * Check whether a status transition is allowed.
 * Returns true if transitioning from `currentStatus` to `newStatus` is valid.
 */
export function isValidTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}
