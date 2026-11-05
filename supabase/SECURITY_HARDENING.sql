-- Boutique ti i — durcissement RLS (à exécuter dans Supabase SQL Editor)
-- IMPORTANT : sauvegarder la base avant exécution et vérifier les noms/colonnes.
-- Cette migration remplace les politiques permissives de FIX_ALL.SQL.
begin;

-- Activer RLS sur les tables sensibles.
alter table public.shops enable row level security;
alter table public.vendors enable row level security;
alter table public.orders enable row level security;
alter table public.admins enable row level security;

-- Les administrateurs ne peuvent lire que leur propre ligne admins.
drop policy if exists admins_read_self on public.admins;
create policy admins_read_self on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Boutiques : accès vendeur propriétaire seulement. La vitrine publique passe par get_shop().
drop policy if exists shops_insert on public.shops;
drop policy if exists shops_select on public.shops;
drop policy if exists shops_update on public.shops;
drop policy if exists shops_owner_select on public.shops;
drop policy if exists shops_owner_insert on public.shops;
drop policy if exists shops_owner_update on public.shops;
drop policy if exists shops_admin_select on public.shops;

create policy shops_owner_select on public.shops
  for select to authenticated using (owner = (select auth.uid()));
create policy shops_admin_select on public.shops
  for select to authenticated using (
    exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
create policy shops_owner_insert on public.shops
  for insert to authenticated with check (owner = (select auth.uid()));
create policy shops_owner_update on public.shops
  for update to authenticated using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

-- Le vendeur ne doit pas pouvoir modifier les colonnes de suspension/ownership.
revoke update on public.shops from authenticated;
grant update (data) on public.shops to authenticated;
grant select, insert on public.shops to authenticated;

-- Profil vendeur : lecture personnelle et lecture admin.
drop policy if exists vendors_owner_select on public.vendors;
drop policy if exists vendors_admin_select on public.vendors;
drop policy if exists vendors_owner_update on public.vendors;
create policy vendors_owner_select on public.vendors
  for select to authenticated using (id = (select auth.uid()));
create policy vendors_admin_select on public.vendors
  for select to authenticated using (
    exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
create policy vendors_owner_update on public.vendors
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Empêche un vendeur de s'auto-approuver ou de changer le motif de refus.
revoke update on public.vendors from authenticated;
grant update (full_name, phone, country, location, shop_name, id_doc_path, id_consent_at)
  on public.vendors to authenticated;
grant select on public.vendors to authenticated;

-- Statuts d'identité : seuls les administrateurs via cette fonction peuvent les modifier.
create or replace function public.admin_set_vendor_status(
  p_vendor_id uuid, p_status text, p_reason text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Accès administrateur requis';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Statut invalide';
  end if;
  update public.vendors
    set id_status = p_status,
        id_reject_reason = case when p_status = 'rejected' then nullif(trim(p_reason), '') else null end
    where id = p_vendor_id;
  if not found then raise exception 'Vendeur introuvable'; end if;
end;
$$;
revoke all on function public.admin_set_vendor_status(uuid, text, text) from public;
grant execute on function public.admin_set_vendor_status(uuid, text, text) to authenticated;

-- Suspension : seul un administrateur peut changer shops.suspended.
create or replace function public.admin_set_shop_suspended(p_shop_id text, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Accès administrateur requis';
  end if;
  update public.shops set suspended = p_suspended where id::text = p_shop_id;
  if not found then raise exception 'Boutique introuvable'; end if;
end;
$$;
revoke all on function public.admin_set_shop_suspended(text, boolean) from public;
grant execute on function public.admin_set_shop_suspended(text, boolean) to authenticated;

-- Commandes : vendeur propriétaire seulement. La création publique doit passer par place_order().
drop policy if exists orders_owner_select on public.orders;
drop policy if exists orders_owner_update on public.orders;
create policy orders_owner_select on public.orders
  for select to authenticated using (
    exists (select 1 from public.shops s
      where s.id = orders.shop_id and s.owner = (select auth.uid()))
    or exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
create policy orders_owner_update on public.orders
  for update to authenticated using (
    exists (select 1 from public.shops s
      where s.id = orders.shop_id and s.owner = (select auth.uid()))
    or exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.shops s
      where s.id = orders.shop_id and s.owner = (select auth.uid()))
    or exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
revoke insert, delete on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

-- Documents d'identité : bucket privé, chemin commençant par l'UID du propriétaire.
drop policy if exists id_docs_owner_read on storage.objects;
drop policy if exists id_docs_owner_insert on storage.objects;
drop policy if exists id_docs_owner_delete on storage.objects;
drop policy if exists id_docs_admin_read on storage.objects;
create policy id_docs_owner_read on storage.objects
  for select to authenticated using (
    bucket_id = 'id-docs' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy id_docs_admin_read on storage.objects
  for select to authenticated using (
    bucket_id = 'id-docs' and exists (
      select 1 from public.admins a where a.user_id = (select auth.uid())
    )
  );
create policy id_docs_owner_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'id-docs' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy id_docs_owner_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'id-docs' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
    )
  );

-- Images de boutique : lecture publique possible, écriture limitée au dossier du vendeur.
drop policy if exists shop_media_public_read on storage.objects;
drop policy if exists shop_media_owner_insert on storage.objects;
drop policy if exists shop_media_owner_update on storage.objects;
drop policy if exists shop_media_owner_delete on storage.objects;
create policy shop_media_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'shop-media');
create policy shop_media_owner_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'shop-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy shop_media_owner_update on storage.objects
  for update to authenticated using (
    bucket_id = 'shop-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'shop-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy shop_media_owner_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'shop-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- À vérifier séparément avant mise en production :
-- 1) get_shop doit être SECURITY DEFINER, ne retourner que les boutiques approuvées/non suspendues
--    et ne jamais exposer id_doc_path, email, téléphone privé ou données administratives.
-- 2) place_order doit recalculer prix/total côté serveur à partir des produits en base.
-- 3) track_view doit incrémenter les visites côté serveur sans UPDATE public sur shops.
-- 4) delete_my_account doit vérifier auth.uid() et supprimer uniquement le compte appelant.
-- 5) FIX_ALL.SQL ne doit plus être exécuté : ses policies shops_insert/select avec true sont publiques.
