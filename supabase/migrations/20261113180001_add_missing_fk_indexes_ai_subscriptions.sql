-- Add indexes for foreign-key lookups used by the AI conversation and subscription core.
-- These indexes do not alter existing rows or vendor access rules.
begin;
create index if not exists ai_conversations_shop_id_idx
  on public.ai_conversations (shop_id);
create index if not exists ai_usage_reservations_shop_id_idx
  on public.ai_usage_reservations (shop_id);
create index if not exists vendor_subscriptions_plan_id_idx
  on public.vendor_subscriptions (plan_id);
commit;
