ALTER TABLE public.idea
ADD COLUMN IF NOT EXISTS category_fields JSONB NOT NULL DEFAULT '{}'::jsonb;