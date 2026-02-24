import { z } from "zod";
import { VALID_TRANSITIONS } from "@/lib/constants";

/**
 * Zod schema for admin status update requests.
 * Requires evaluatorComment (min 10 chars) when status = "rejected".
 */
export const statusUpdateSchema = z
  .object({
    status: z.enum(["under_review", "accepted", "rejected"], {
      errorMap: () => ({ message: "Invalid status" }),
    }),
    evaluatorComment: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "rejected") {
        return (
          typeof data.evaluatorComment === "string" &&
          data.evaluatorComment.trim().length >= 10
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
 * Terminal states (accepted, rejected) have no outgoing transitions.
 */
export function isValidTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}
