revoke execute on function public.current_role_name() from anon, public;
revoke execute on function public.is_project_member(uuid) from anon, public;
grant execute on function public.current_role_name() to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
