-- Historique privé des conversations de l'assistant commercial Boutique ti i.
-- Les accès passent exclusivement par l'Edge Function authentifiée (service_role).
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null references public.shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_conversations_messages_array check (jsonb_typeof(messages) = 'array'),
  constraint ai_conversations_title_length check (char_length(title) between 1 and 120)
);
create index if not exists ai_conversations_owner_shop_updated_idx
  on public.ai_conversations (owner_id, shop_id, updated_at desc);
alter table public.ai_conversations enable row level security;
revoke all on table public.ai_conversations from anon, authenticated;
grant all on table public.ai_conversations to service_role;
