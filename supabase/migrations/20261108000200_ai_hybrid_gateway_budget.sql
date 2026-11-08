-- Boutique ti i: quota et budget centralises pour l'assistant IA hybride.
-- A relire puis executer manuellement dans Supabase SQL Editor.
-- Ne modifie ni les profils vendors, ni la verification d'identite, ni les droits admin.

begin;

create table if not exists public.ai_monthly_budget (
  id smallint primary key check (id = 1),
  budget_usd numeric(12,6) not null check (budget_usd >= 0),
  updated_at timestamptz not null default now()
);

insert into public.ai_monthly_budget (id, budget_usd)
values (1, 10.000000)
on conflict (id) do nothing;

create table if not exists public.ai_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  shop_id text not null references public.shops(id) on delete cascade,
  reserved_usd numeric(12,8) not null check (reserved_usd > 0),
  status text not null default 'pending'
    check (status in ('pending','settled','released')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists ai_usage_reservations_created_idx
  on public.ai_usage_reservations(created_at desc);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.ai_usage_reservations(id) on delete restrict,
  user_id uuid not null,
  shop_id text not null references public.shops(id) on delete cascade,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_usd numeric(12,8) not null check (cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_month_idx
  on public.ai_usage_events(user_id, created_at desc);
create index if not exists ai_usage_events_shop_month_idx
  on public.ai_usage_events(shop_id, created_at desc);

alter table public.ai_monthly_budget enable row level security;
alter table public.ai_usage_reservations enable row level security;
alter table public.ai_usage_events enable row level security;

revoke all on public.ai_monthly_budget from public, anon, authenticated;
revoke all on public.ai_usage_reservations from public, anon, authenticated;
revoke all on public.ai_usage_events from public, anon, authenticated;

grant all on public.ai_monthly_budget to service_role;
grant all on public.ai_usage_reservations to service_role;
grant all on public.ai_usage_events to service_role;

create or replace function public.reserve_ai_budget(
  p_user_id uuid,
  p_shop_id text,
  p_estimated_cost_usd numeric,
  p_max_requests_per_month integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_budget numeric(12,6);
  v_spent numeric(12,8);
  v_reserved numeric(12,8);
  v_user_requests bigint;
  v_reservation_id uuid;
  v_month_start timestamptz;
begin
  if p_user_id is null or p_shop_id is null or length(trim(p_shop_id)) = 0
     or p_estimated_cost_usd is null or p_estimated_cost_usd <= 0
     or p_max_requests_per_month < 1 then
    raise exception 'Parametres de reservation invalides';
  end if;

  select budget_usd into v_budget
  from public.ai_monthly_budget
  where id = 1
  for update;

  if v_budget is null then
    raise exception 'Budget IA non configure';
  end if;

  v_month_start := date_trunc('month', now());

  -- Libere les reservations abandonnees pour ne pas bloquer le budget indefiniment.
  update public.ai_usage_reservations
  set status = 'released', settled_at = now()
  where status = 'pending'
    and created_at < now() - interval '30 minutes';

  select coalesce(sum(cost_usd), 0)
    into v_spent
  from public.ai_usage_events
  where created_at >= v_month_start;

  select coalesce(sum(reserved_usd), 0)
    into v_reserved
  from public.ai_usage_reservations
  where status = 'pending'
    and created_at >= v_month_start;

  select count(*)
    into v_user_requests
  from public.ai_usage_events
  where user_id = p_user_id
    and created_at >= v_month_start;

  select v_user_requests + count(*)
    into v_user_requests
  from public.ai_usage_reservations
  where user_id = p_user_id
    and status = 'pending'
    and created_at >= v_month_start;

  if v_user_requests >= p_max_requests_per_month then
    return jsonb_build_object('allowed', false, 'reason', 'monthly_user_quota');
  end if;

  if (v_spent + v_reserved + p_estimated_cost_usd) > v_budget then
    return jsonb_build_object('allowed', false, 'reason', 'monthly_budget_reached');
  end if;

  insert into public.ai_usage_reservations(user_id, shop_id, reserved_usd)
  values (p_user_id, p_shop_id, p_estimated_cost_usd)
  returning id into v_reservation_id;

  return jsonb_build_object(
    'allowed', true,
    'reservation_id', v_reservation_id,
    'remaining_usd', greatest(0, v_budget - v_spent - v_reserved - p_estimated_cost_usd)
  );
end;
$function$;

create or replace function public.settle_ai_budget(
  p_reservation_id uuid,
  p_provider text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_actual_cost_usd numeric
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_reservation public.ai_usage_reservations%rowtype;
begin
  select * into v_reservation
  from public.ai_usage_reservations
  where id = p_reservation_id
  for update;

  if not found then raise exception 'Reservation IA introuvable'; end if;
  if v_reservation.status <> 'pending' then return; end if;
  if p_actual_cost_usd is null or p_actual_cost_usd < 0
     or p_input_tokens < 0 or p_output_tokens < 0 then
    raise exception 'Mesures IA invalides';
  end if;

  insert into public.ai_usage_events(
    reservation_id, user_id, shop_id, provider, model,
    input_tokens, output_tokens, cost_usd
  ) values (
    v_reservation.id, v_reservation.user_id, v_reservation.shop_id,
    left(coalesce(p_provider, 'unknown'), 40),
    left(coalesce(p_model, 'unknown'), 120),
    p_input_tokens, p_output_tokens, p_actual_cost_usd
  );

  update public.ai_usage_reservations
  set status = 'settled', settled_at = now()
  where id = p_reservation_id;
end;
$function$;

create or replace function public.release_ai_budget(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  update public.ai_usage_reservations
  set status = 'released', settled_at = now()
  where id = p_reservation_id and status = 'pending';
end;
$function$;

revoke all on function public.reserve_ai_budget(uuid,text,numeric,integer)
  from public, anon, authenticated;
revoke all on function public.settle_ai_budget(uuid,text,text,integer,integer,numeric)
  from public, anon, authenticated;
revoke all on function public.release_ai_budget(uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_ai_budget(uuid,text,numeric,integer) to service_role;
grant execute on function public.settle_ai_budget(uuid,text,text,integer,integer,numeric) to service_role;
grant execute on function public.release_ai_budget(uuid) to service_role;

commit;
