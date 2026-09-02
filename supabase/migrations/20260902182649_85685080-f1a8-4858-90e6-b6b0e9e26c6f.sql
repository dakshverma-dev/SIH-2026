REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_role_name() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_role_name() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can(text) TO authenticated, service_role;