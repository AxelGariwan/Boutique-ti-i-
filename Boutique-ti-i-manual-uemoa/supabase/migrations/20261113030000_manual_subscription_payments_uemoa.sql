-- Boutique ti i — paiements manuels d'abonnement (UEMOA + préparation CEMAC)
-- Migration additive : ne supprime aucun prestataire ni paiement historique.
-- A appliquer uniquement après réconciliation de l'historique distant.

begin;

alter table public.subscription_payments
  add column if not exists payment_method text,
  add column if not exists payer_phone text,
  add column if not exists payer_reference text,
  add column if not exists admin_note text,
  add column if not exists reviewed_by uuid references public.admins(user_id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists subscription_payments_manual_pending_idx
  on public.subscription_payments(status, created_at desc)
  where provider = 'manual_transfer';

create table if not exists public.subscription_manual_payment_methods (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency text not null check (currency in ('XOF','XAF')),
  method_code text not null check (method_code in
    ('wave','orange_money','pi_spi','mtn_momo','airtel_money','moov_money','tmoney','free_money','other')),
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

drop policy if exists subscription_manual_methods_active_read
  on public.subscription_manual_payment_methods;
create policy subscription_manual_methods_active_read
  on public.subscription_manual_payment_methods
  for select to authenticated
  using (is_active = true or private.is_admin());

drop policy if exists subscription_manual_methods_admin_manage
  on public.subscription_manual_payment_methods;
create policy subscription_manual_methods_admin_manage
  on public.subscription_manual_payment_methods
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

grant select, insert, update, delete
  on public.subscription_manual_payment_methods to authenticated;
grant all on public.subscription_manual_payment_methods to service_role;

drop policy if exists subscription_plans_admin_read
  on public.subscription_plans;
create policy subscription_plans_admin_read
  on public.subscription_plans
  for select to authenticated
  using (is_active = true or private.is_admin());

-- Keep Senegal's existing plans untouched; add only the seven missing UEMOA countries.
insert into public.subscription_plans (slug,country_code,currency,amount,is_active)
select p.slug, c.country_code, 'XOF', p.amount, true
from (values
  ('starter',3000::bigint),('pro',6000::bigint),('premium',10000::bigint)
) as p(slug,amount)
cross join (values
  ('BJ'),('BF'),('CI'),('GW'),('ML'),('NE'),('TG')
) as c(country_code)
on conflict (slug,country_code,currency) do nothing;

-- Seller creates a pending manual payment. Ownership, country, plan, amount and
-- configured method are all checked server-side; the browser cannot set amount/currency.
create or replace function public.create_manual_subscription_payment(
  p_shop_id text,
  p_plan_slug text,
  p_method_code text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_shop public.shops%rowtype;
  v_country text;
  v_currency text;
  v_plan public.subscription_plans%rowtype;
  v_payment_id uuid;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  if p_plan_slug not in ('starter','pro','premium') then raise exception 'Forfait invalide'; end if;

  select * into v_shop
  from public.shops
  where id = p_shop_id and owner = v_uid
  for update;
  if not found then raise exception 'Boutique introuvable ou accès refusé'; end if;

  v_country := case lower(trim(coalesce(v_shop.data->>'country','')))
    when 'bénin' then 'BJ' when 'benin' then 'BJ'
    when 'burkina faso' then 'BF'
    when 'côte d’ivoire' then 'CI' when 'côte d ivoire' then 'CI'
    when 'cote d’ivoire' then 'CI' when 'cote d ivoire' then 'CI'
    when 'guinée-bissau' then 'GW' when 'guinee-bissau' then 'GW'
    when 'mali' then 'ML' when 'niger' then 'NE'
    when 'sénégal' then 'SN' when 'senegal' then 'SN'
    when 'togo' then 'TG'
    when 'cameroun' then 'CM' when 'cameroon' then 'CM'
    when 'république centrafricaine' then 'CF' when 'republique centrafricaine' then 'CF'
    when 'centrafrique' then 'CF'
    when 'république du congo' then 'CG' when 'republique du congo' then 'CG'
    when 'congo' then 'CG' when 'gabon' then 'GA' when 'tchad' then 'TD'
    when 'guinée équatoriale' then 'GQ' when 'guinee equatoriale' then 'GQ'
    else null end;

  v_currency := upper(trim(coalesce(v_shop.data->>'currency','')));
  if v_country is null or v_currency not in ('XOF','XAF') then
    raise exception 'Paiement manuel non disponible pour ce pays ou cette devise';
  end if;
  if (v_country in ('BJ','BF','CI','GW','ML','NE','SN','TG') and v_currency <> 'XOF')
     or (v_country in ('CM','CF','CG','GA','TD','GQ') and v_currency <> 'XAF') then
    raise exception 'La devise de la boutique ne correspond pas au pays';
  end if;

  if not exists (
    select 1 from public.subscription_manual_payment_methods m
    where m.country_code = v_country and m.currency = v_currency
      and m.method_code = p_method_code and m.is_active = true
  ) then
    raise exception 'Ce moyen de paiement n''est pas encore configuré pour votre pays';
  end if;

  select * into v_plan
  from public.subscription_plans
  where country_code = v_country and currency = v_currency
    and slug = p_plan_slug and is_active = true;
  if not found then raise exception 'Ce forfait n''est pas disponible pour votre pays'; end if;

  insert into public.subscription_payments
    (shop_id,plan_id,provider,idempotency_key,amount,currency,status,payment_method)
  values
    (v_shop.id,v_plan.id,'manual_transfer',gen_random_uuid()::text,
     v_plan.amount,v_plan.currency,'pending',p_method_code)
  returning id into v_payment_id;

  return v_payment_id;
end;
$function$;

create or replace function public.submit_manual_subscription_reference(
  p_payment_id uuid,
  p_payer_reference text,
  p_payer_phone text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  if p_payer_reference is null or length(trim(p_payer_reference)) < 3
     or length(trim(p_payer_reference)) > 120 then
    raise exception 'Référence de transfert invalide';
  end if;

  update public.subscription_payments p
  set payer_reference = trim(p_payer_reference),
      payer_phone = nullif(trim(coalesce(p_payer_phone,'')),''),
      updated_at = now()
  from public.shops s
  where p.id = p_payment_id
    and p.shop_id = s.id
    and s.owner = v_uid
    and p.provider = 'manual_transfer'
    and p.status = 'pending';
  if not found then raise exception 'Demande introuvable ou déjà traitée'; end if;
end;
$function$;

create or replace function public.admin_review_manual_subscription_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_payment public.subscription_payments%rowtype;
  v_shop public.shops%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_expiry timestamptz;
  v_current_status text;
  v_subscription_id uuid;
  v_admin uuid := (select auth.uid());
begin
  if v_admin is null or not private.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  select * into v_payment
  from public.subscription_payments
  where id = p_payment_id and provider = 'manual_transfer'
  for update;
  if not found then raise exception 'Demande de paiement manuel introuvable'; end if;
  if v_payment.status <> 'pending' then raise exception 'Cette demande a déjà été traitée'; end if;

  if p_approve then
    if v_payment.payer_reference is null or length(trim(v_payment.payer_reference)) < 3 then
      raise exception 'La référence de transfert du vendeur est obligatoire';
    end if;
    if v_payment.payment_method is null then raise exception 'Moyen de paiement manquant'; end if;

    select * into v_shop from public.shops where id = v_payment.shop_id for update;
    if not found then raise exception 'Boutique introuvable'; end if;

    select * into v_plan from public.subscription_plans
    where id = v_payment.plan_id and is_active = true;
    if not found or v_payment.amount <> v_plan.amount
       or v_payment.currency <> v_plan.currency then
      raise exception 'Incohérence entre le paiement et le forfait';
    end if;

    select vs.status,vs.expires_at into v_current_status,v_expiry
    from public.vendor_subscriptions vs
    where vs.shop_id = v_payment.shop_id
      and vs.status in ('trialing','active','past_due')
    order by vs.created_at desc
    limit 1
    for update;

    -- Paid renewal extends the current paid period; trial conversion starts now.
    if v_current_status = 'active' and v_expiry > now() then
      null;
    else
      v_expiry := now();
    end if;

    update public.vendor_subscriptions
    set status = 'expired', updated_at = now()
    where shop_id = v_payment.shop_id
      and status in ('trialing','active','past_due');

    insert into public.vendor_subscriptions
      (shop_id,plan_id,status,starts_at,expires_at,auto_renew)
    values
      (v_payment.shop_id,v_payment.plan_id,'active',v_expiry,v_expiry + interval '1 month',false)
    returning id into v_subscription_id;

    update public.subscription_payments
    set status = 'paid', paid_at = now(), reviewed_by = v_admin,
        reviewed_at = now(), admin_note = nullif(trim(coalesce(p_admin_note,'')),''),
        subscription_id = v_subscription_id, updated_at = now()
    where id = p_payment_id;

    update public.shops
    set data = jsonb_set(coalesce(data,'{}'::jsonb),'{plan}',to_jsonb(v_plan.slug),true),
        updated_at = now()
    where id = v_payment.shop_id;

    update public.vendors set trial_end = null where id = v_shop.owner;
  else
    update public.subscription_payments
    set status = 'failed', reviewed_by = v_admin, reviewed_at = now(),
        admin_note = nullif(trim(coalesce(p_admin_note,'')),''),
        updated_at = now()
    where id = p_payment_id;
  end if;
end;
$function$;

revoke all on function public.create_manual_subscription_payment(text,text,text)
  from public,anon;
grant execute on function public.create_manual_subscription_payment(text,text,text)
  to authenticated;
revoke all on function public.submit_manual_subscription_reference(uuid,text,text)
  from public,anon;
grant execute on function public.submit_manual_subscription_reference(uuid,text,text)
  to authenticated;
revoke all on function public.admin_review_manual_subscription_payment(uuid,boolean,text)
  from public,anon;
grant execute on function public.admin_review_manual_subscription_payment(uuid,boolean,text)
  to authenticated;

grant all on public.subscription_payments to service_role;
grant select on public.subscription_payments to authenticated;
grant select on public.subscription_plans to authenticated;

commit;
