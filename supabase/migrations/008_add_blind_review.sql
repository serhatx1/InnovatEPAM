-- Migration 008: Add blind review support
-- Creates portal_setting table for key-value portal-wide configuration.

-- ── Table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_setting (
  key         TEXT          PRIMARY KEY,
  value       JSONB         NOT NULL,
  updated_by  UUID          NOT NULL REFERENCES user_profile(id),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────

ALTER TABLE portal_setting ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read settings (needed by API layer)
CREATE POLICY "portal_setting_select_authenticated"
  ON portal_setting
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert settings
CREATE POLICY "portal_setting_insert_admin"
  ON portal_setting
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = auth.uid()
        AND user_profile.role = 'admin'
    )
  );

-- Only admins can update settings
CREATE POLICY "portal_setting_update_admin"
  ON portal_setting
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = auth.uid()
        AND user_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = auth.uid()
        AND user_profile.role = 'admin'
    )
  );
