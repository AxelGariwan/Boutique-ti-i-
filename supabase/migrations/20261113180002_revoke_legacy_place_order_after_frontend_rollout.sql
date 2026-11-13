-- SECURITY ROLLOUT GATE:
-- Apply this migration ONLY AFTER the production storefront (main) is deployed
-- with the JSONB cart-based place_order(text,text,text,text,text,text,jsonb) RPC.
-- The current production frontend still calls the legacy overload with p_total,
-- so applying this before the frontend rollout would break customer checkout.
begin;
revoke all on function public.place_order(text, text, text, text, text, text, text)
  from public, anon, authenticated;
commit;
