-- ============================================================================
-- 008 — Team Management Enhancement
-- Adds is_active toggle and last_sign_in_at tracking to profiles.
-- ============================================================================

-- Add is_active column for quick enable/disable without deleting accounts
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add last_sign_in_at for tracking user activity
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

-- Add email column to profiles for easier querying (denormalized from auth.users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Allow admins/socios to update any profile in their own org
DROP POLICY IF EXISTS "profiles_update_admin_org" ON profiles;
CREATE POLICY "profiles_update_admin_org"
    ON profiles FOR UPDATE
    USING (
        organization_id = get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('socio', 'admin')
        )
    );
