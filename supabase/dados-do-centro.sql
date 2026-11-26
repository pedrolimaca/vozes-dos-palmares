-- Execute no SQL Editor do Supabase após instalar o schema do site.
begin;

create table if not exists public.dados_centro (
  id integer primary key check (id = 1),
  endereco text not null default '',
  horarios text not null default '',
  email text not null default '',
  telefone text not null default '',
  whatsapp text not null default '',
  mapa text not null default '' check (mapa = '' or mapa ~* '^https?://')
);

alter table public.dados_centro enable row level security;

drop policy if exists "Ler dados do centro" on public.dados_centro;
create policy "Ler dados do centro" on public.dados_centro
  for select to anon, authenticated using (true);

drop policy if exists "Admin cria dados do centro" on public.dados_centro;
create policy "Admin cria dados do centro" on public.dados_centro
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admin edita dados do centro" on public.dados_centro;
create policy "Admin edita dados do centro" on public.dados_centro
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.dados_centro to anon, authenticated;
grant insert, update on public.dados_centro to authenticated;

commit;
