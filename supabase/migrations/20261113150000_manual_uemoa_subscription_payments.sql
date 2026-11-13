-- Manual subscription transfers for the eight UEMOA countries.
-- Safe extension: preserves existing subscription providers and payment history.

alter table public.subscription_payments
  add column if not exists payment_method text,
  add column if not exists payer_phone text,
  add column if not exists payer_reference text,
  add column if not exists admin_note text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create unique index if not exists subscription_payments_manual_reference_uidx
  on public.subscription_payments (payment_method, lower(payer_reference))
  where provider = 'manual_transfer' and payer_reference is not null;

create table if not exists public.subscription_manual_payment_methods (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code in ('BJ','BF','CI','GW','ML','NE','SN','TG','CM','CF','CG','GA','TD','GQ')),
  currency text not null check ((country_code in ('BJ','BF','CI','GW','ML','NE','SN','TG') and currency = 'XOF') or (country_code in ('CM','CF','CG','GA','TD','GQ') and currency = 'XAF')),
  method_code text not null check (method_code in ('wave','orange_money','pi_spi','mtn_momo','moov_money','airtel_money','other')),
  display_name text not null,
  account_name text not null,
  account_reference text not null,
  instructions text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_code, method_code)
);

alter table public.subscription_manual_payment_methods enable row level security;

drop policy if exists subscription_manual_methods_active_read on public.subscription_manual_payment_methods;
create policy subscription_manual_methods_active_read
  on public.subscription_manual_payment_methods
  for select to authenticated
  using (is_active = true or private.is_admin());

drop policy if exists subscription_manual_methods_admin_write on public.subscription_manual_payment_methods;
create policy subscription_manual_methods_admin_write
  on public.subscription_manual_payment_methods
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Existing prices remain unchanged; add the seven missing UEMOA markets.
insert into public.subscription_plans (slug, country_code, currency, amount, billing_interval, is_active)
select p.slug, c.country_code, 'XOF', p.amount, 'month', true
from (values
  ('starter', 3000::bigint),
  ('pro', 6000::bigint),
  ('premium', 10000::bigint)
) as p(slug, amount)
cross join (values ('BJ'),('BF'),('CI'),('GW'),('ML'),('NE'),('TG')) as c(country_code)
on conflict (slug, country_code, currency)
do update set amount = excluded.amount, billing_interval = excluded.billing_interval, is_active = true;

create or replace function public.admin_review_manual_subscription_payment(
  p_payment_id uuid,
  p_decision text,
  p_note text default null
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
  if auth.uid() is null or not exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Accès administrateur requis';
  end if;

  if p_decision not in ('approve','reject') then
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
        reviewed_by = auth.uid(),
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
      reviewed_by = auth.uid(),
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
  set trial_end = null
  where id = v_shop.owner;
end;
$$;

revoke all on function public.admin_review_manual_subscription_payment(uuid,text,text) from public, anon;
grant execute on function public.admin_review_manual_subscription_payment(uuid,text,text) to authenticated;

comment on table public.subscription_manual_payment_methods is
  'Admin-configured receiving coordinates for manual vendor subscription payments by UEMOA country.';
