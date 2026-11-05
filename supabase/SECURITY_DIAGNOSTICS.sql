-- Boutique ti i — diagnostic AVANT migration sécurité
-- À exécuter dans Supabase SQL Editor. Lecture seule : ne modifie rien.
-- Copie les résultats et partage-les pour adapter la migration au vrai schéma.

-- 1) Colonnes et types des tables utilisées par l'application.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('shops','vendors','orders','admins')
order by table_name, ordinal_position;

-- 2) Toutes les politiques RLS des tables métier ET du stockage.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('shops','vendors','orders','admins'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 3) État RLS des tables.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname='public' and c.relname in ('shops','vendors','orders','admins'))
   or (n.nspname='storage' and c.relname='objects')
order by 1,2;

-- 4) Buckets et visibilité publique.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('id-docs','shop-media');

-- 5) Fonctions RPC utilisées par le code et leur définition.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('get_shop','place_order','track_view','delete_my_account',
                    'admin_set_vendor_status','admin_set_shop_suspended')
order by p.proname;

-- 6) Déclencheurs susceptibles de supprimer des comptes ou modifier les données.
select event_object_table, trigger_name, action_timing, event_manipulation,
       action_statement
from information_schema.triggers
where trigger_schema='public'
  and event_object_table in ('shops','vendors','orders')
order by event_object_table, trigger_name;

-- 7) Contraintes utiles (statuts, clés étrangères, unicité).
select tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name as foreign_table, ccu.column_name as foreign_column,
       cc.check_clause
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name=kcu.constraint_name and tc.constraint_schema=kcu.constraint_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name=ccu.constraint_name and tc.constraint_schema=ccu.constraint_schema
left join information_schema.check_constraints cc
  on tc.constraint_name=cc.constraint_name and tc.constraint_schema=cc.constraint_schema
where tc.constraint_schema='public'
  and tc.table_name in ('shops','vendors','orders','admins')
order by tc.table_name, tc.constraint_name;
