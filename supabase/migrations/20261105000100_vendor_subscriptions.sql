-- Boutique ti i — abonnements vendeurs (base réelle shops.owner_id)
-- À relire puis exécuter dans Supabase SQL Editor après sauvegarde.
-- Ce fichier ne touche pas aux commandes clients ni à leurs paiements.

begin;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug in ('starter','pro','premium')),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount bigint not null check (amount >= 0),
  billing_interval text not null default 'month' check (billing_interval = 'month'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (slug, country_code, currency)
);

create table if not exists public.vendor_subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null check (status in ('trialing','active','past_due','expired','cancelled')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  trial_ends_at timestamptz,
  auto_renew boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vendor_subscriptions_one_current_per_shop
  on public.vendor_subscriptions(shop_id)
  where status in ('trialing','active','past_due');

create index if not exists vendor_subscriptions_shop_created_idx
  on public.vendor_subscriptions(shop_id, created_at desc);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  subscription_id uuid references public.vendor_subscriptions(id) on delete set null,
  plan_id uuid not null references public.subscription_plans(id),
  provider text not null check (length(trim(provider)) between 2 and 40),
  provider_reference text,
  idempotency_key text not null unique,
  amount bigint not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create index if not exists subscription_payments_shop_created_idx
  on public.subscription_payments(shop_id, created_at desc);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload_sha256 text,
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

-- Tarifs initiaux du Sénégal. Les autres pays seront ajoutés avec leurs prix/devise
-- après validation des prestataires et des règles locales.
insert into public.subscription_plans (slug, country_code, currency, amount)
values
  ('starter','SN','XOF',3000),
  ('pro','SN','XOF',6000),
  ('premium','SN','XOF',10000),
  -- Plan technique non achetable : permet l'essai Pro même avant la configuration
  -- des prix locaux dans les autres pays africains.
  ('pro','ZZ','XXX',0)
on conflict (slug, country_code, currency)
do update set amount = excluded.amount, is_active = case
  when excluded.country_code = 'ZZ' then false else true end;

-- Reprise prudente des essais historiques encore valides (sans inventer de paiements).
-- Les boutiques sans trial_end futur ne sont pas marquées comme payantes.
insert into public.vendor_subscriptions
  (shop_id, plan_id, status, starts_at, expires_at, trial_ends_at, auto_renew)
select
  s.id,
  p.id,
  'trialing',
  now(),
  s.trial_end,
  s.trial_end,
  false
from public.shops s
join public.subscription_plans p
  on p.slug = case when s.plan in ('starter','pro','premium') then s.plan else 'pro' end
 and p.currency = upper(coalesce(nullif(s.currency,''), 'XOF'))
 and p.country_code = case
   when upper(trim(coalesce(s.country,''))) in ('SN','SENEGAL','SÉNÉGAL') then 'SN'
   when length(trim(coalesce(s.country,''))) = 2 then upper(trim(s.country))
   else null
 end
where s.trial_end is not null
  and s.trial_end > now()
on conflict do nothing;

alter table public.subscription_plans enable row level security;
alter table public.vendor_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.payment_webhook_events enable row level security;

drop policy if exists subscription_plans_public_read on public.subscription_plans;
create policy subscription_plans_public_read on public.subscription_plans
  for select to anon, authenticated using (is_active = true);

drop policy if exists vendor_subscriptions_owner_read on public.vendor_subscriptions;
create policy vendor_subscriptions_owner_read on public.vendor_subscriptions
  for select to authenticated using (
    exists (
      select 1 from public.shops s
      where s.id = vendor_subscriptions.shop_id
        and s.owner_id = (select auth.uid())
    )
  );

drop policy if exists subscription_payments_owner_read on public.subscription_payments;
create policy subscription_payments_owner_read on public.subscription_payments
  for select to authenticated using (
    exists (
      select 1 from public.shops s
      where s.id = subscription_payments.shop_id
        and s.owner_id = (select auth.uid())
    )
  );

-- Aucune policy client d'écriture sur abonnements, paiements ou webhooks.
revoke all on public.vendor_subscriptions from anon, authenticated;
grant select on public.vendor_subscriptions to authenticated;
revoke all on public.subscription_payments from anon, authenticated;
grant select on public.subscription_payments to authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
revoke all on public.subscription_plans from public, anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant all on public.subscription_plans, public.vendor_subscriptions, public.subscription_payments, public.payment_webhook_events to service_role;

-- Toute activation d'essai est faite côté base, jamais depuis le navigateur.
-- BEFORE INSERT : renseigne les champs du magasin. AFTER INSERT : crée l'abonnement
-- (la ligne shops doit déjà exister pour satisfaire la clé étrangère).
create or replace function public.prepare_pro_trial_for_new_shop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
begin
  select p.id into v_plan_id
  from public.subscription_plans p
  where p.slug = 'pro'
    and p.country_code = case
      when upper(trim(coalesce(new.country,''))) in ('SN','SENEGAL','SÉNÉGAL') then 'SN'
      when length(trim(coalesce(new.country,''))) = 2 then upper(trim(new.country))
      else null
    end
    and p.currency = upper(coalesce(new.currency, 'XOF'))
    and p.is_active = true
  limit 1;

  if v_plan_id is null then
    select p.id into v_plan_id
    from public.subscription_plans p
    where p.slug = 'pro' and p.country_code = 'ZZ' and p.currency = 'XXX'
    limit 1;
  end if;

  if v_plan_id is null then
    raise exception 'Modèle technique Pro indisponible';
  end if;

  new.plan := 'pro';
  new.trial_end := now() + interval '30 days';
  return new;
end;
$$;

create or replace function public.create_pro_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
begin
  select p.id into v_plan_id
  from public.subscription_plans p
  where p.slug = 'pro'
    and p.country_code = case
      when upper(trim(coalesce(new.country,''))) in ('SN','SENEGAL','SÉNÉGAL') then 'SN'
      when length(trim(coalesce(new.country,''))) = 2 then upper(trim(new.country))
      else null
    end
    and p.currency = upper(coalesce(new.currency, 'XOF'))
    and p.is_active = true
  limit 1;

  if v_plan_id is null then
    select p.id into v_plan_id
    from public.subscription_plans p
    where p.slug = 'pro' and p.country_code = 'ZZ' and p.currency = 'XXX'
    limit 1;
  end if;

  insert into public.vendor_subscriptions
    (shop_id, plan_id, status, starts_at, expires_at, trial_ends_at, auto_renew)
  values
    (new.id, v_plan_id, 'trialing', now(), new.trial_end, new.trial_end, false);

  return new;
end;
$$;

drop trigger if exists shops_start_pro_trial on public.shops;
create trigger shops_prepare_pro_trial
before insert on public.shops
for each row execute function public.prepare_pro_trial_for_new_shop();

drop trigger if exists shops_create_pro_trial_subscription on public.shops;
create trigger shops_create_pro_trial_subscription
after insert on public.shops
for each row execute function public.create_pro_trial_subscription();

-- Fonction réservée au serveur (Edge Function après vérification cryptographique
-- du webhook du prestataire). Elle est idempotente au niveau du paiement.
create or replace function public.confirm_vendor_subscription_payment(
  p_payment_id uuid,
  p_provider_reference text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.subscription_payments%rowtype;
  v_expiry timestamptz;
  v_subscription_id uuid;
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
  if p_provider_reference is null or length(trim(p_provider_reference)) < 3 then
    raise exception 'Référence prestataire invalide';
  end if;

  select greatest(coalesce(max(vs.expires_at), now()), now())
    into v_expiry
  from public.vendor_subscriptions vs
  where vs.shop_id = v_payment.shop_id
    and vs.status in ('trialing','active','past_due');

  update public.subscription_payments
    set status = 'paid',
        provider_reference = p_provider_reference,
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

  update public.shops s
    set plan = (select p.slug from public.subscription_plans p where p.id = v_payment.plan_id),
        trial_end = null
    where s.id = v_payment.shop_id;
end;
$$;

revoke all on function public.prepare_pro_trial_for_new_shop() from public, anon, authenticated;
revoke all on function public.create_pro_trial_subscription() from public, anon, authenticated;
revoke all on function public.confirm_vendor_subscription_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_vendor_subscription_payment(uuid, text) to service_role;

commit;
