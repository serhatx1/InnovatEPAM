import { z } from "zod";
import {
  IDEA_CATEGORIES,
  CATEGORY_FIELD_DEFINITIONS,
  type IdeaCategory,
} from "@/lib/constants";
import type { CategoryFieldDefinition, CategoryFieldValues } from "@/types";

const categorySchema = z.enum(IDEA_CATEGORIES);

function normalizeToStringRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      key,
      value == null ? "" : String(value),
    ])
  );
}

function numberFieldSchema(field: CategoryFieldDefinition) {
  const base = z
    .string()
    .trim()
    .min(1, `${field.field_label} is required`)
    .refine((value) => !Number.isNaN(Number(value)), {
      message: `${field.field_label} must be a valid number`,
    })
    .refine((value) => (field.min == null ? true : Number(value) >= field.min), {
      message: `${field.field_label} must be >= ${field.min}`,
    })
    .refine((value) => (field.max == null ? true : Number(value) <= field.max), {
      message: `${field.field_label} must be <= ${field.max}`,
    })
    .transform((value) => Number(value));

  if (field.is_required) return base;

  return z
    .string()
    .optional()
    .transform((value) => (value == null || value === "" ? undefined : value))
    .refine((value) => value == null || !Number.isNaN(Number(value)), {
      message: `${field.field_label} must be a valid number`,
    })
    .refine((value) => (value == null || field.min == null ? true : Number(value) >= field.min), {
      message: `${field.field_label} must be >= ${field.min}`,
    })
    .refine((value) => (value == null || field.max == null ? true : Number(value) <= field.max), {
      message: `${field.field_label} must be <= ${field.max}`,
    })
    .transform((value) => (value == null ? undefined : Number(value)));
}

function textFieldSchema(field: CategoryFieldDefinition) {
  const base = z.string().trim();

  if (!field.pattern) {
    return field.is_required
      ? base.min(1, `${field.field_label} is required`)
      : base.optional();
  }

  const regex = new RegExp(field.pattern);

  if (field.is_required) {
    return base
      .min(1, `${field.field_label} is required`)
      .refine((value: string) => regex.test(value), `${field.field_label} format is invalid`);
  }

  return base
    .optional()
    .refine(
      (value: string | undefined) => value == null || value === "" || regex.test(value),
      `${field.field_label} format is invalid`
    );
}

function selectFieldSchema(field: CategoryFieldDefinition) {
  const options = field.options ?? [];
  const base = z.string().trim();

  if (field.is_required) {
    return base
      .min(1, `${field.field_label} is required`)
      .refine(
        (value: string) => options.includes(value),
        `${field.field_label} must be one of: ${options.join(", ")}`
      );
  }

  return base.optional().refine(
    (value: string | undefined) => value == null || value === "" || options.includes(value),
    `${field.field_label} must be one of: ${options.join(", ")}`
  );
}

function schemaForField(field: CategoryFieldDefinition) {
  if (field.field_type === "number") return numberFieldSchema(field);
  if (field.field_type === "select") return selectFieldSchema(field);
  return textFieldSchema(field);
}

export function buildCategoryFieldsSchema(category: IdeaCategory) {
  const definitions = CATEGORY_FIELD_DEFINITIONS[category] ?? [];

  const shape = Object.fromEntries(
    definitions.map((field) => [field.field_key, schemaForField(field)])
  );

  return z.object(shape).strip();
}

export function validateCategoryFieldsForCategory(
  categoryInput: string,
  categoryFieldsInput: unknown
):
  | { success: true; data: CategoryFieldValues }
  | { success: false; errors: Record<string, string[]> } {
  const parsedCategory = categorySchema.safeParse(categoryInput);
  if (!parsedCategory.success) {
    return { success: false, errors: { category: ["Category is required"] } };
  }

  const normalized = normalizeToStringRecord(categoryFieldsInput);
  const schema = buildCategoryFieldsSchema(parsedCategory.data);
  const parsed = schema.safeParse(normalized);

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const errors = Object.fromEntries(
      Object.entries(flattened).filter(([, value]) => Array.isArray(value) && value.length > 0)
    ) as Record<string, string[]>;
    return { success: false, errors };
  }

  const compact = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined && value !== "")
  ) as CategoryFieldValues;

  return { success: true, data: compact };
}
