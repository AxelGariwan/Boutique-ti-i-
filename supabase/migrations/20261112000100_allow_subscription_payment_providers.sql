-- Allow only the explicitly integrated subscription payment providers.
-- This migration changes the confirmation RPC only; it does not touch identity,
-- shop ownership, admin permissions, or the existing PayDunya webhook flow.

create or replace function public.confirm_vendor_subscription_payment(
  p_payment_id uuid,
  p_provider_reference text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_payment public.subscription_payments%rowtype;
  v_shop public.shops%rowtype;
  v_expiry timestamptz;
  v_subscription_id uuid;
  v_plan_slug text;
  v_current_status text;
  v_plan_amount bigint;
  v_plan_currency text;
begin
  select * into v_payment
  from public.subscription_payments
  where id = p_payment_id
  for update;

  if not found then raise exception 'Paiement introuvable'; end if;
  if v_payment.status = 'paid' then return; end if;
  if v_payment.status <> 'pending' then
    raise exception 'Ce paiement ne peut pas être confirmé';
  end if;
  if p_provider_reference is null or length(trim(p_provider_reference)) < 3
     or v_payment.provider_reference is distinct from p_provider_reference then
    raise exception 'Référence prestataire invalide';
  end if;
  if v_payment.provider not in ('paydunya', 'nkap_pay', 'capay_global') then
    raise exception 'Prestataire de paiement non autorisé';
  end if;

  select * into v_shop
  from public.shops
  where id = v_payment.shop_id
  for update;

  if not found then raise exception 'Boutique introuvable'; end if;

  select slug, amount, currency
    into v_plan_slug, v_plan_amount, v_plan_currency
  from public.subscription_plans
  where id = v_payment.plan_id;

  if v_plan_slug is null
     or v_payment.amount <> v_plan_amount
     or v_payment.currency <> v_plan_currency then
    raise exception 'Incohérence entre le paiement et le forfait';
  end if;

  select vs.status, vs.expires_at
    into v_current_status, v_expiry
  from public.vendor_subscriptions vs
  where vs.shop_id = v_payment.shop_id
    and vs.status in ('trialing','active','past_due')
  order by vs.created_at desc
  limit 1
  for update;

  if v_current_status = 'active' and v_expiry > now() then
    null;
  else
    v_expiry := now();
  end if;

  update public.subscription_payments
    set status = 'paid',
        paid_at = now(),
        updated_at = now()
    where id = p_payment_id;

  update public.vendor_subscriptions
    set status = 'expired', updated_at = now()
    where shop_id = v_payment.shop_id
      and status in ('trialing','active','past_due');

  insert into public.vendor_subscriptions
    (shop_id, plan_id, status, starts_at, expires_at, auto_renew)
  values
    (v_payment.shop_id, v_payment.plan_id, 'active',
     v_expiry, v_expiry + interval '1 month', false)
  returning id into v_subscription_id;

  update public.subscription_payments
    set subscription_id = v_subscription_id, updated_at = now()
    where id = p_payment_id;

  update public.shops
    set data = jsonb_set(coalesce(data, '{}'::jsonb), '{plan}', to_jsonb(v_plan_slug), true),
        updated_at = now()
    where id = v_payment.shop_id;

  update public.vendors
    set trial_end = null
    where id = v_shop.owner;
end;
$function$;

revoke all on function public.confirm_vendor_subscription_payment(uuid, text)
  from public, anon, authenticated;
grant execute on function public.confirm_vendor_subscription_payment(uuid, text)
  to service_role;
