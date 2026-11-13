-- Restrict direct invocation of trigger-only vendor trial functions.
-- PostgreSQL checks EXECUTE privilege when a trigger is created, not for each
-- row-level trigger invocation. Existing triggers continue to run.
-- This migration does not change trial dates, identity verification, admin
-- permissions, vendor/shop data, or subscription records.

begin;

revoke all on function public.create_initial_vendor_trial()
  from public, anon, authenticated;

revoke all on function public.create_trials_for_vendor_profile()
  from public, anon, authenticated;

commit;
