-- Add is_onboarded flag to settings table
-- Defaults to false for new rows; existing users are marked as already onboarded.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false;

-- Mark all existing users as onboarded (they have already been using the app)
UPDATE public.settings SET is_onboarded = true WHERE is_onboarded = false;
