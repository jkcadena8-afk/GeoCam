-- GeoCam, Semana 9: sincronizacion en dos sentidos con login.
-- Ejecutar despues de schema.sql. Se puede repetir sin efectos.

-- La app sube por usuario: las fotos anteriores (sin user_id) quedan invisibles para ella.
alter table public.photos
  alter column uri drop not null,
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  add column if not exists client_id text unique,
  add column if not exists taken_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  -- Reloj del servidor: cuando llego cada cambio a Supabase (cursor de bajada)
  add column if not exists server_updated_at timestamptz not null default now();

create or replace function public.touch_server_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;

drop trigger if exists photos_touch_server_updated_at on public.photos;
create trigger photos_touch_server_updated_at
  before insert or update on public.photos
  for each row execute function public.touch_server_updated_at();

create index if not exists photos_user_server_updated_idx
  on public.photos (user_id, server_updated_at);

-- Fuera el acceso anonimo: cada cuenta solo ve y edita lo suyo
drop policy if exists "anon all albums" on public.albums;
drop policy if exists "anon all photos" on public.photos;
drop policy if exists "anon upload photos bucket" on storage.objects;
drop policy if exists "anon delete photos bucket" on storage.objects;

drop policy if exists "ver las mias" on public.photos;
create policy "ver las mias" on public.photos
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "crear las mias" on public.photos;
create policy "crear las mias" on public.photos
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- upsert necesita permiso de actualizar, ademas de insertar y leer
drop policy if exists "editar las mias" on public.photos;
create policy "editar las mias" on public.photos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Bucket privado: cada usuario escribe en su carpeta <user_id>/
insert into storage.buckets (id, name, public)
values ('geocam', 'geocam', false)
on conflict (id) do nothing;

drop policy if exists "geocam leer las mias" on storage.objects;
create policy "geocam leer las mias" on storage.objects
  for select to authenticated
  using (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "geocam subir las mias" on storage.objects;
create policy "geocam subir las mias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid())::text);
