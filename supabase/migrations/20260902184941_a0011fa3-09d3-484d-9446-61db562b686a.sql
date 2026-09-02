-- RLS policies invoke these helpers with the caller's privileges, so the
-- authenticated role needs USAGE on the private schema and EXECUTE on the
-- helpers. The schema is not exposed through the Data API, so they still
-- cannot be called as RPC endpoints.
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT EXECUTE ON FUNCTION app.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app.current_role_name() TO authenticated;
GRANT EXECUTE ON FUNCTION app.can(text) TO authenticated;
GRANT EXECUTE ON FUNCTION app.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION app.current_role_name() TO service_role;
GRANT EXECUTE ON FUNCTION app.can(text) TO service_role;