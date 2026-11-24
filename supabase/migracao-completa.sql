-- MIGRAÇÃO ÚNICA: leva qualquer versão anterior do banco até a versão atual.
-- Pode ser executada mais de uma vez sem problemas. Não apaga dados.
-- (Substitui os antigos migracao-galeria-contato.sql, migracao-livros.sql e migracao-acesso-relatos.sql.)

-- perfis
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists bloqueado boolean not null default false;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','editor','admin'));

-- livros e fotos
alter table public.livros add column if not exists capa text;
alter table public.livros add column if not exists detalhes text;
alter table public.livros add column if not exists sobre_autor text;
alter table public.livros add column if not exists ano int;
alter table public.livros add column if not exists editora text;
alter table public.livros add column if not exists localizacao text;
alter table public.livros add column if not exists disponivel boolean not null default true;
alter table public.fotos add column if not exists descricao text;
alter table public.fotos add column if not exists data date;

-- mensagens de contato
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 120),
  email text not null check (char_length(email) between 5 and 200),
  mensagem text not null check (char_length(mensagem) between 1 and 3000),
  created_at timestamptz default now()
);
alter table public.mensagens enable row level security;

-- relatos
create table if not exists public.relatos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  texto text not null check (char_length(texto) between 3 and 1000),
  created_at timestamptz default now()
);
create index if not exists relatos_created_at_idx on public.relatos (created_at desc);
alter table public.relatos enable row level security;

-- funções e gatilho
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email) values (new.id, new.raw_user_meta_data->>'nome', new.email);
  return new;
end $$;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not bloqueado)
$$;
-- equipe = administradores e editores
create or replace function public.is_staff() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','editor') and not bloqueado)
$$;
-- pode comentar: precisa estar logado e não estar bloqueado
create or replace function public.can_post() returns boolean
language sql security definer stable set search_path = public as $$
  select auth.uid() is not null and not exists (select 1 from public.profiles where id = auth.uid() and bloqueado)
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- mantém profiles.email igual ao e-mail de acesso quando a pessoa o troca em "Minha conta"
create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.sync_profile_email();


-- políticas: apaga as antigas e recria todas
drop policy if exists "admin livros" on public.livros;
drop policy if exists "admin eventos" on public.eventos;
drop policy if exists "admin fotos" on public.fotos;
drop policy if exists "enviar mensagem" on public.mensagens;
drop policy if exists "admin le mensagens" on public.mensagens;
drop policy if exists "admin apaga mensagens" on public.mensagens;
drop policy if exists "ler relatos" on public.relatos;
drop policy if exists "publicar relato" on public.relatos;
drop policy if exists "apagar relato" on public.relatos;
drop policy if exists "perfil proprio" on public.profiles;
drop policy if exists "admin ve perfis" on public.profiles;
drop policy if exists "admin altera perfis" on public.profiles;
drop policy if exists "ler livros" on public.livros;
drop policy if exists "ler eventos" on public.eventos;
drop policy if exists "ler fotos" on public.fotos;
drop policy if exists "equipe livros" on public.livros;
drop policy if exists "equipe eventos" on public.eventos;
drop policy if exists "equipe fotos" on public.fotos;
drop policy if exists "ler arquivos" on storage.objects;
drop policy if exists "enviar fotos" on storage.objects;
drop policy if exists "remover fotos" on storage.objects;

create policy "enviar mensagem" on public.mensagens for insert to anon, authenticated with check (true);
create policy "admin le mensagens" on public.mensagens for select using (public.is_admin());
create policy "admin apaga mensagens" on public.mensagens for delete using (public.is_admin());
create policy "ler relatos" on public.relatos for select using (true);
create policy "publicar relato" on public.relatos for insert to authenticated with check (user_id = auth.uid() and public.can_post());
create policy "apagar relato" on public.relatos for delete using (user_id = auth.uid() or public.is_staff());
create policy "perfil proprio" on public.profiles for select using (id = auth.uid());
create policy "admin ve perfis" on public.profiles for select using (public.is_admin());
create policy "admin altera perfis" on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin() and (id <> auth.uid() or (role = 'admin' and not bloqueado)));
create policy "ler livros" on public.livros for select using (true);
create policy "ler eventos" on public.eventos for select using (true);
create policy "ler fotos" on public.fotos for select using (true);
create policy "equipe livros" on public.livros for all using (public.is_staff()) with check (public.is_staff());
create policy "equipe eventos" on public.eventos for all using (public.is_staff()) with check (public.is_staff());
create policy "equipe fotos" on public.fotos for all using (public.is_staff()) with check (public.is_staff());
create policy "ler arquivos" on storage.objects for select using (bucket_id = 'fotos');
create policy "enviar fotos" on storage.objects for insert with check (bucket_id = 'fotos' and public.is_staff());
create policy "remover fotos" on storage.objects for delete using (bucket_id = 'fotos' and public.is_staff());

-- o nome exibido no relato vem sempre do perfil (o navegador não pode assinar como outra pessoa)
create or replace function public.relato_define_nome() returns trigger
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  select coalesce(nullif(trim(p.nome),''), nullif(split_part(p.email,'@',1),'')) into n from public.profiles p where p.id = new.user_id;
  new.nome := left(coalesce(n,'Visitante'),80);
  return new;
end $$;
drop trigger if exists relato_nome on public.relatos;
create trigger relato_nome before insert on public.relatos for each row execute function public.relato_define_nome();

-- atividades do centro (aparecem na página "O Centro"; só a equipe edita)
create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 120),
  descricao text check (char_length(descricao) <= 600),
  ordem int not null default 0,
  created_at timestamptz default now()
);
alter table public.atividades enable row level security;
drop policy if exists "ler atividades" on public.atividades;
drop policy if exists "equipe atividades" on public.atividades;
create policy "ler atividades" on public.atividades for select using (true);
create policy "equipe atividades" on public.atividades for all using (public.is_staff()) with check (public.is_staff());
insert into public.atividades (titulo, descricao, ordem)
select * from (values
 ('Biblioteca e leitura', 'Consulta e leitura de livros sobre história, literatura e cultura afro-brasileira e africana.', 1),
 ('Exposição', 'Espaço de exposição sobre a cultura africana e afro-brasileira.', 2),
 ('Oficina de pintura em tecido', 'Criação de estampas e desenhos em tecido.', 3),
 ('Oficina de abayomis', 'Confecção das bonecas de pano abayomi, símbolo de afeto e resistência na cultura afro-brasileira.', 4),
 ('Música e dança', 'Vivências de música e dança de matriz afro-brasileira.', 5)
) v(titulo, descricao, ordem) where not exists (select 1 from public.atividades);

insert into storage.buckets (id, name, public) values ('fotos','fotos',true) on conflict (id) do nothing;
