-- 1. Nettoyage et configuration RLS pour la table shops
alter table public.shops enable row level security;

drop policy if exists "shops_insert" on public.shops;
create policy "shops_insert" on public.shops for insert with check (true);

drop policy if exists "shops_select" on public.shops;
create policy "shops_select" on public.shops for select using (true);

drop policy if exists "shops_update" on public.shops;
create policy "shops_update" on public.shops for update using (auth.uid() = owner_id);

-- 2. Fonction de suppression automatique dans auth.users
create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from auth.users where id = old.owner_id;
  return old;
end;
$$;

drop trigger if exists on_shop_deleted on public.shops;
create trigger on_shop_deleted
  after delete on public.shops
  for each row execute function public.handle_user_delete();