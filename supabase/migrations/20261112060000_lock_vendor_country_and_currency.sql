-- Freeze a vendor's country after registration and derive the shop currency
-- from that original country. Admin/service-role operations retain the existing
-- privileged bypass in both guard functions.

CREATE OR REPLACE FUNCTION private.shops_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_vendor_country text;
  v_country text;
  v_currency text;
BEGIN
  NEW.updated_at := now();

  IF (SELECT auth.uid()) IS NULL OR private.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT country
      INTO v_vendor_country
      FROM public.vendors
     WHERE id = NEW.owner;

    v_country := COALESCE(v_vendor_country, NEW.data->>'country');

    NEW.suspended := false;
    NEW.data := jsonb_set(COALESCE(NEW.data, '{}'::jsonb), '{plan}', '"pro"'::jsonb, true);
  ELSE
    NEW.id := OLD.id;
    NEW.owner := OLD.owner;
    NEW.suspended := OLD.suspended;

    IF OLD.data ? 'plan' THEN
      NEW.data := jsonb_set(COALESCE(NEW.data, '{}'::jsonb), '{plan}', OLD.data->'plan', true);
    ELSE
      NEW.data := COALESCE(NEW.data, '{}'::jsonb) - 'plan';
    END IF;

    SELECT country
      INTO v_vendor_country
      FROM public.vendors
     WHERE id = OLD.owner;

    v_country := COALESCE(OLD.data->>'country', v_vendor_country);
  END IF;

  IF v_country IS NOT NULL THEN
    v_currency := CASE v_country
      WHEN 'Afrique du Sud' THEN 'ZAR'
      WHEN 'Algérie' THEN 'DZD'
      WHEN 'Angola' THEN 'AOA'
      WHEN 'Bénin' THEN 'XOF'
      WHEN 'Botswana' THEN 'BWP'
      WHEN 'Burkina Faso' THEN 'XOF'
      WHEN 'Burundi' THEN 'BIF'
      WHEN 'Cameroun' THEN 'XAF'
      WHEN 'Cap-Vert' THEN 'CVE'
      WHEN 'République centrafricaine' THEN 'XAF'
      WHEN 'Comores' THEN 'KMF'
      WHEN 'République du Congo' THEN 'XAF'
      WHEN 'République démocratique du Congo' THEN 'USD'
      WHEN 'Côte d’Ivoire' THEN 'XOF'
      WHEN 'Djibouti' THEN 'DJF'
      WHEN 'Égypte' THEN 'EGP'
      WHEN 'Érythrée' THEN 'ERN'
      WHEN 'Eswatini' THEN 'SZL'
      WHEN 'Éthiopie' THEN 'ETB'
      WHEN 'Gabon' THEN 'XAF'
      WHEN 'Gambie' THEN 'GMD'
      WHEN 'Ghana' THEN 'GHS'
      WHEN 'Guinée' THEN 'GNF'
      WHEN 'Guinée-Bissau' THEN 'XOF'
      WHEN 'Guinée équatoriale' THEN 'XAF'
      WHEN 'Kenya' THEN 'KES'
      WHEN 'Lesotho' THEN 'LSL'
      WHEN 'Liberia' THEN 'USD'
      WHEN 'Libye' THEN 'LYD'
      WHEN 'Madagascar' THEN 'MGA'
      WHEN 'Malawi' THEN 'MWK'
      WHEN 'Mali' THEN 'XOF'
      WHEN 'Maroc' THEN 'MAD'
      WHEN 'Maurice' THEN 'MUR'
      WHEN 'Mauritanie' THEN 'MRU'
      WHEN 'Mozambique' THEN 'MZN'
      WHEN 'Namibie' THEN 'NAD'
      WHEN 'Niger' THEN 'XOF'
      WHEN 'Nigéria' THEN 'NGN'
      WHEN 'Ouganda' THEN 'UGX'
      WHEN 'Rwanda' THEN 'RWF'
      WHEN 'Sao Tomé-et-Principe' THEN 'STN'
      WHEN 'Sénégal' THEN 'XOF'
      WHEN 'Seychelles' THEN 'SCR'
      WHEN 'Sierra Leone' THEN 'SLE'
      WHEN 'Somalie' THEN 'SOS'
      WHEN 'Soudan' THEN 'SDG'
      WHEN 'Soudan du Sud' THEN 'SSP'
      WHEN 'Tanzanie' THEN 'TZS'
      WHEN 'Tchad' THEN 'XAF'
      WHEN 'Togo' THEN 'XOF'
      WHEN 'Tunisie' THEN 'TND'
      WHEN 'Zambie' THEN 'ZMW'
      WHEN 'Zimbabwe' THEN 'ZWG'
      ELSE COALESCE(NEW.data->>'currency', 'XOF')
    END;

    NEW.data := jsonb_set(COALESCE(NEW.data, '{}'::jsonb), '{country}', to_jsonb(v_country), true);
    NEW.data := jsonb_set(NEW.data, '{currency}', to_jsonb(v_currency), true);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.vendors_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR private.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Identity, country, subscription and verification fields are server-managed.
  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.country := OLD.country;
  NEW.trial_end := OLD.trial_end;
  NEW.created_at := OLD.created_at;
  NEW.terms_accepted_at := OLD.terms_accepted_at;
  NEW.terms_version := OLD.terms_version;
  NEW.id_verified_at := OLD.id_verified_at;
  NEW.id_verified_by := OLD.id_verified_by;
  NEW.consent_at := OLD.consent_at;

  NEW.id_consent_at := OLD.id_consent_at;

  IF NEW.id_doc_path IS DISTINCT FROM OLD.id_doc_path THEN
    IF NEW.id_doc_path IS NULL THEN
      NEW.id_doc_path := OLD.id_doc_path;
      NEW.id_status := OLD.id_status;
      NEW.id_reject_reason := OLD.id_reject_reason;
    ELSIF OLD.id_doc_path IS NULL THEN
      NEW.id_status := OLD.id_status;
      NEW.id_reject_reason := OLD.id_reject_reason;
      NEW.id_consent_at := now();
    ELSIF OLD.id_status = 'rejected' THEN
      NEW.id_status := 'pending';
      NEW.id_reject_reason := NULL;
      NEW.id_consent_at := now();
    ELSE
      NEW.id_doc_path := OLD.id_doc_path;
      NEW.id_status := OLD.id_status;
      NEW.id_reject_reason := OLD.id_reject_reason;
    END IF;
  ELSE
    NEW.id_doc_path := OLD.id_doc_path;
    NEW.id_status := OLD.id_status;
    NEW.id_reject_reason := OLD.id_reject_reason;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION private.shops_guard() IS
  'Protects shop ownership, plan, country and currency; country/currency are derived from the vendor profile.';
COMMENT ON FUNCTION private.vendors_guard() IS
  'Protects vendor identity, country, subscription, consent and identity-verification fields.';
