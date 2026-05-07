revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
revoke execute on function public.is_staff(uuid) from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;
alter function public.touch_updated_at() set search_path = public;