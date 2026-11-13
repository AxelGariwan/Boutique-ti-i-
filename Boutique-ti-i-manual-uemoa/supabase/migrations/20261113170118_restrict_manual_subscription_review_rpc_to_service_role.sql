-- Restrict the privileged subscription review RPC to service_role.
-- The Edge Function verifies the caller's JWT and admin membership before invoking it.
drop function if exists public.admin_review_manual_subscription_payment(uuid,text,text);

create function public.admin_review_manual_subscription_payment(
  p_payment_id uuid,
  p_decision text,
  p_note text,
  p_admin_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.subscription_payments%rowtype;
  v_shop public.shops%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_current_expiry timestamptz;
  v_start timestamptz;
  v_subscription_id uuid;
begin
  if p_admin_id is null or not exists (
    select 1 from public.admins a where a.user_id = p_admin_id
  ) then
    raise exception 'Accès administrateur requis';
  end if;

  if coalesce(p_decision,'') not in ('approve','reject') then
    raise exception 'Décision invalide';
  end if;

  select * into v_payment
  from public.subscription_payments
  where id = p_payment_id
  for update;

  if not found then raise exception 'Demande de paiement introuvable'; end if;
  if v_payment.provider <> 'manual_transfer' then
    raise exception 'Cette demande ne correspond pas à un paiement manuel';
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'Cette demande a déjà été traitée';
  end if;

  select * into v_shop
  from public.shops
  where id = v_payment.shop_id
  for update;

  if not found then raise exception 'Boutique introuvable'; end if;

  select * into v_plan
  from public.subscription_plans
  where id = v_payment.plan_id and is_active = true;

  if not found
     or v_plan.amount <> v_payment.amount
     or v_plan.currency <> v_payment.currency then
    raise exception 'Le forfait ou le montant ne correspond plus';
  end if;

  if p_decision = 'reject' then
    update public.subscription_payments
    set status = 'failed',
        admin_note = nullif(trim(coalesce(p_note,'')), ''),
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        updated_at = now()
    where id = p_payment_id;
    return;
  end if;

  if v_payment.payer_reference is null
     or length(trim(v_payment.payer_reference)) < 3
     or coalesce(v_payment.payment_method,'') not in ('wave','orange_money','pi_spi','mtn_momo','moov_money','airtel_money','other') then
    raise exception 'Référence ou moyen de paiement manquant';
  end if;

  select greatest(
    now(),
    coalesce(max(expires_at), now()),
    coalesce(max(trial_ends_at), now())
  ) into v_start
  from public.vendor_subscriptions
  where shop_id = v_payment.shop_id
    and status in ('trialing','active','past_due');

  update public.subscription_payments
  set status = 'paid',
      paid_at = now(),
      admin_note = nullif(trim(coalesce(p_note,'')), ''),
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_payment_id;

  update public.vendor_subscriptions
  set status = 'expired', updated_at = now()
  where shop_id = v_payment.shop_id
    and status in ('trialing','active','past_due');

  insert into public.vendor_subscriptions
    (shop_id, plan_id, status, starts_at, expires_at, auto_renew)
  values
    (v_payment.shop_id, v_payment.plan_id, 'active', v_start, v_start + interval '1 month', false)
  returning id into v_subscription_id;

  update public.subscription_payments
  set subscription_id = v_subscription_id, updated_at = now()
  where id = p_payment_id;

  update public.shops
  set data = jsonb_set(coalesce(data, '{}'::jsonb), '{plan}', to_jsonb(v_plan.slug), true),
      updated_at = now()
  where id = v_payment.shop_id;

  update public.vendors
  set trial_end = now()
  where id = v_shop.owner;
end;
$$;

revoke all on function public.admin_review_manual_subscription_payment(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_review_manual_subscription_payment(uuid,text,text,uuid) to service_role;

comment on table public.subscription_manual_payment_methods is
  'Admin-configured receiving coordinates for manual vendor subscription payments by UEMOA country.';
