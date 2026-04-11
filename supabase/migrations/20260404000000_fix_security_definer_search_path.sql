-- Fix SECURITY DEFINER functions missing SET search_path = ''
-- This prevents search_path hijacking attacks.
--
-- Functions that had SECURITY DEFINER with no search_path at all:
ALTER FUNCTION is_pii_disclosed(uuid, uuid) SET search_path = '';
ALTER FUNCTION insurer_search_certificates(text, integer, integer, text, text) SET search_path = '';
ALTER FUNCTION insurer_get_certificate(text, text, text) SET search_path = '';
ALTER FUNCTION insurer_search_vehicles(text, integer, integer, text, text) SET search_path = '';
ALTER FUNCTION insurer_get_vehicle_certificates(uuid, text, text) SET search_path = '';
ALTER FUNCTION insurer_accessible_tenant_ids(uuid) SET search_path = '';
ALTER FUNCTION insurer_search_stores(text, integer, integer, text, text) SET search_path = '';
ALTER FUNCTION platform_certificate_stats() SET search_path = '';
ALTER FUNCTION platform_tenant_category_stats() SET search_path = '';
ALTER FUNCTION platform_insurer_count() SET search_path = '';
ALTER FUNCTION platform_regional_stats() SET search_path = '';
ALTER FUNCTION get_certificate_service_price(uuid) SET search_path = '';

-- Functions that had SET search_path = public (should be empty string):
ALTER FUNCTION get_my_user_contexts() SET search_path = '';
