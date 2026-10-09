-- Run this in Supabase SQL Editor.
-- Creates profiles for new Auth users without allowing clients to choose a role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep role changes out of client reach. Admin role changes should be done
-- by a trusted server/database administrator only.
revoke update (role) on table public.profiles from anon, authenticated;
