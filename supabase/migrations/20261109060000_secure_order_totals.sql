-- Server-side order validation and authoritative totals for Boutique ti i.
-- Product IDs, prices, titles and stock are read from shops.data; browser totals are never trusted.
-- Existing orders remain intact. Legacy RPC signature is disabled after the new RPC is installed.

begin;

alter table public.orders
  add column if not exists items jsonb not null default '[]'::jsonb;

create or replace function public.place_order(
  p_shop text,
  p_ref text,
  p_name text,
  p_phone text,
  p_mode text,
  p_message text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_shop_data jsonb;
  v_item jsonb;
  v_product jsonb;
  v_product_id text;
  v_quantity integer;
  v_price numeric;
  v_line_total numeric;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_message text;
  v_lines text := '';
begin
  if coalesce(length(trim(p_name)), 0) = 0 or length(p_name) > 120
     or coalesce(length(trim(p_phone)), 0) = 0 or length(p_phone) > 40
     or length(coalesce(p_message, '')) > 4000
     or length(coalesce(p_ref, '')) = 0 or length(p_ref) > 40
     or length(coalesce(p_mode, '')) > 120
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 50 then
    return jsonb_build_object('ok', false, 'error', 'Informations de commande invalides.');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as submitted(value)
    group by submitted.value->>'id'
    having count(*) > 1
  ) then
    return jsonb_build_object('ok', false, 'error', 'Un même produit apparaît plusieurs fois dans le panier.');
  end if;

  select s.data into v_shop_data
  from public.shops s
  join public.vendors v on v.id = s.owner
  where s.id = p_shop and not s.suspended and v.id_status = 'approved'
  for share of s;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Cette boutique n’est pas disponible.');
  end if;

  if (select count(*) from public.orders where shop_id = p_shop and created_at > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'error', 'Trop de commandes ont été envoyées à cette boutique. Réessayez plus tard.');
  end if;
  if (select count(*) from public.orders where customer_phone = trim(p_phone) and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Trop de commandes ont été envoyées avec ce numéro. Réessayez plus tard.');
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'id';

    if v_product_id is null or length(v_product_id) > 100
       or jsonb_typeof(v_item->'quantity') <> 'number'
       or (v_item->>'quantity') !~ '^[1-9][0-9]{0,2}$' then
      return jsonb_build_object('ok', false, 'error', 'Un article ou une quantité du panier est invalide.');
    end if;

    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 100 then
      return jsonb_build_object('ok', false, 'error', 'La quantité demandée est trop élevée.');
    end if;

    select product.value into v_product
    from jsonb_array_elements(coalesce(v_shop_data->'products', '[]'::jsonb)) as product(value)
    where product.value->>'id' = v_product_id
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'Un produit du panier n’existe plus dans cette boutique.');
    end if;

    if coalesce(v_product->'inStock', 'false'::jsonb) <> 'true'::jsonb then
      return jsonb_build_object('ok', false, 'error', 'Un produit du panier est en rupture de stock.');
    end if;

    if jsonb_typeof(v_product->'price') <> 'number'
       or (v_product->>'price') !~ '^[0-9]+$' then
      return jsonb_build_object('ok', false, 'error', 'Le prix d’un produit est invalide. Contactez le vendeur.');
    end if;

    v_price := (v_product->>'price')::numeric;
    v_line_total := v_price * v_quantity;
    v_total := v_total + v_line_total;

    if v_total > 9000000000000000000 then
      return jsonb_build_object('ok', false, 'error', 'Le montant de la commande est trop élevé.');
    end if;

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id', v_product_id,
      'title', coalesce(v_product->>'title', 'Article'),
      'price', v_price,
      'quantity', v_quantity,
      'line_total', v_line_total
    ));

    v_lines := v_lines || case when v_lines = '' then '' else E'\\n' end
      || v_quantity::text || ' x ' || coalesce(v_product->>'title', 'Article')
      || ' (' || v_price::text || ')';
  end loop;

  v_message := v_lines || E'\\nTotal : ' || v_total::text
    || case when coalesce(trim(p_message), '') = '' then '' else E'\\n' || trim(p_message) end;

  insert into public.orders
    (shop_id, ref, customer_name, customer_phone, total, pay_mode, message, items)
  values
    (p_shop, trim(p_ref), trim(p_name), trim(p_phone), v_total::bigint::text,
     coalesce(p_mode, ''), v_message, v_items);

  return jsonb_build_object('ok', true, 'total', v_total, 'items', v_items, 'message', v_message);
end;
$function$;

-- Disable the old client-total RPC so stale clients cannot submit arbitrary totals.
revoke all on function public.place_order(text, text, text, text, text, text, text)
  from public, anon, authenticated;

revoke all on function public.place_order(text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb)
  to anon, authenticated;

commit;
