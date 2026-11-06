-- Boutique ti i: protect vendor identity-verification audit fields.
-- Apply this migration in Supabase SQL Editor after reviewing it.
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

  -- Account identity and server/admin-controlled lifecycle fields.
  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.trial_end := OLD.trial_end;
  NEW.created_at := OLD.created_at;
  NEW.terms_accepted_at := OLD.terms_accepted_at;
  NEW.terms_version := OLD.terms_version;
  NEW.id_verified_at := OLD.id_verified_at;
  NEW.id_verified_by := OLD.id_verified_by;
  NEW.consent_at := OLD.consent_at;

  -- A rejected vendor may replace the document, which returns the case to pending.
  IF NEW.id_doc_path IS DISTINCT FROM OLD.id_doc_path AND OLD.id_status = 'rejected' THEN
    NEW.id_status := 'pending';
    NEW.id_reject_reason := NULL;
  ELSIF NEW.id_doc_path IS DISTINCT FROM OLD.id_doc_path AND OLD.id_doc_path IS NULL THEN
    NEW.id_status := OLD.id_status;
    NEW.id_reject_reason := OLD.id_reject_reason;
  ELSE
    NEW.id_doc_path := OLD.id_doc_path;
    NEW.id_status := OLD.id_status;
    NEW.id_reject_reason := OLD.id_reject_reason;
    NEW.id_consent_at := OLD.id_consent_at;
  END IF;

  RETURN NEW;
END
$function$;
