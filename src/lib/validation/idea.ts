import { z } from "zod";

export const ideaSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
});

export type IdeaInput = z.infer<typeof ideaSchema>;
