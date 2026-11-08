-- Boutique ti i: abonnements compatibles avec le schema reel shops(owner, data jsonb)
-- A executer manuellement dans Supabase SQL Editor apres revue.
-- Ne modifie pas vendors_guard ni les champs de verification d'identite.

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
  shop_id text not null references public.shops(id) on delete cascade,
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
  shop_id text not null references public.shops(id) on delete cascade,
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

-- Tarifs configurés à ce stade uniquement pour le Sénégal.
insert into public.subscription_plans (slug, country_code, currency, amount, is_active)
values
  ('starter','SN','XOF',3000,true),
  ('pro','SN','XOF',5984,true),
  ('premium','SN','XOF',10000,true),
  -- Plan technique non achetable, uniquement pour référencer les essais historiques
  -- des pays dont le tarif local n'est pas encore activé.
  ('pro','ZZ','XXX',0,false)
on conflict (slug, country_code, currency)
do update set amount = excluded.amount, is_active = excluded.is_active;

-- Reprise des essais existants sans créer de paiements fictifs.
-- Les trois boutiques de test ne sont PAS considérées comme payées.
insert into public.vendor_subscriptions
  (shop_id, plan_id, status, starts_at, expires_at, trial_ends_at, auto_renew)
select
  s.id,
  p.id,
  'trialing',
  coalesce(v.created_at, now()),
  v.trial_end,
  v.trial_end,
  false
from public.shops s
join public.vendors v on v.id = s.owner
join public.subscription_plans p
  on p.slug = 'pro' and p.country_code = 'ZZ' and p.currency = 'XXX'
where v.trial_end is not null
  and v.trial_end > now()
  and coalesce(s.data->>'plan','pro') = 'pro'
  and not exists (
    select 1 from public.vendor_subscriptions vs
    where vs.shop_id = s.id
      and vs.status in ('trialing','active','past_due')
  );

-- Création automatique de l'essai pour les nouvelles boutiques.
-- Le profil vendeur possède déjà trial_end (défaut : 30 jours après création).
-- Le déclencheur ne touche ni au profil vendeur ni à la vérification d'identité.
create or replace function public.create_initial_vendor_trial()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_trial_end timestamptz;
  v_vendor_created timestamptz;
  v_trial_plan_id uuid;
begin
  select trial_end, created_at
    into v_trial_end, v_vendor_created
  from public.vendors
  where id = new.owner;

  if v_trial_end is null or v_trial_end <= now() then
    return new;
  end if;

  select id into v_trial_plan_id
  from public.subscription_plans
  where slug = 'pro'
    and country_code = 'ZZ'
    and currency = 'XXX'
    and is_active = false
  limit 1;

  if v_trial_plan_id is null then
    raise exception 'Plan technique d’essai introuvable';
  end if;

  insert into public.vendor_subscriptions
    (shop_id, plan_id, status, starts_at, expires_at, trial_ends_at, auto_renew)
  values
    (new.id, v_trial_plan_id, 'trialing',
     coalesce(v_vendor_created, now()), v_trial_end, v_trial_end, false)
  on conflict (shop_id)
    where status in ('trialing','active','past_due')
    do nothing;

  return new;
end;
$function$;

drop trigger if exists shops_create_initial_trial on public.shops;
create trigger shops_create_initial_trial
after insert on public.shops
for each row execute function public.create_initial_vendor_trial();

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
        and (s.owner = (select auth.uid()) or private.is_admin())
    )
  );

drop policy if exists subscription_payments_owner_read on public.subscription_payments;
create policy subscription_payments_owner_read on public.subscription_payments
  for select to authenticated using (
    exists (
      select 1 from public.shops s
      where s.id = subscription_payments.shop_id
        and (s.owner = (select auth.uid()) or private.is_admin())
    )
  );

revoke all on public.vendor_subscriptions from anon, authenticated;
grant select on public.vendor_subscriptions to authenticated;
revoke all on public.subscription_payments from anon, authenticated;
grant select on public.subscription_payments to authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
revoke all on public.subscription_plans from public, anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant all on public.subscription_plans, public.vendor_subscriptions,
  public.subscription_payments, public.payment_webhook_events to service_role;

-- Le vendeur peut modifier les autres champs de data, mais pas choisir son plan.
-- La voie service_role (auth.uid() NULL) et l'administrateur conservent le controle.
create or replace function private.shops_guard()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  new.updated_at := now();

  if (select auth.uid()) is null or private.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.suspended := false;
    new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{plan}', '"pro"'::jsonb, true);
  else
    new.id := old.id;
    new.owner := old.owner;
    new.suspended := old.suspended;

    if old.data ? 'plan' then
      new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{plan}', old.data->'plan', true);
    else
      new.data := coalesce(new.data, '{}'::jsonb) - 'plan';
    end if;
  end if;

  return new;
end
$function$;

-- Confirmation appelée uniquement par la fonction webhook via service_role.
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

  select * into v_shop
  from public.shops
  where id = v_payment.shop_id
  for update;

  if not found then raise exception 'Boutique introuvable'; end if;

  select slug into v_plan_slug
  from public.subscription_plans
  where id = v_payment.plan_id;

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

commit;
