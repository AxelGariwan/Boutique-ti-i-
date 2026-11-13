do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscription_manual_payment_methods'::regclass
      and conname = 'subscription_manual_methods_pi_spi_uemoa_only'
  ) then
    alter table public.subscription_manual_payment_methods
      add constraint subscription_manual_methods_pi_spi_uemoa_only
      check (method_code <> 'pi_spi' or country_code in ('BJ','BF','CI','GW','ML','NE','SN','TG'));
  end if;
end $$;
