-- Optional seller-controlled cash on delivery and explicit payment collection state.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'paid'));
  END IF;
END
$$;

-- Enforce the seller's setting server-side; hiding the option in the browser
-- alone would not prevent a forged checkout request.
CREATE OR REPLACE FUNCTION public.enforce_cash_on_delivery_setting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.pay_mode = 'Paiement à la livraison'
     AND NOT EXISTS (
       SELECT 1
       FROM public.shops AS s
       WHERE s.id = NEW.shop_id
         AND s.data->'allowCod' = 'true'::jsonb
     ) THEN
    RAISE EXCEPTION 'Le paiement à la livraison n’est pas activé par cette boutique.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_cash_on_delivery_setting() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_cash_on_delivery_setting ON public.orders;
CREATE TRIGGER enforce_cash_on_delivery_setting
BEFORE INSERT OR UPDATE OF pay_mode, shop_id
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cash_on_delivery_setting();
