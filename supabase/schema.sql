-- Execute no Supabase: SQL Editor > New query > Run
-- Permissões: user (comenta), editor (livros, eventos, fotos e relatos), admin (tudo, inclusive usuários e mensagens)

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text,
  email text,
  role text not null default 'user' check (role in ('user','editor','admin')),
  bloqueado boolean not null default false,
  created_at timestamptz default now()
);

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


create table public.livros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, autor text not null,
  tema text not null default 'Outro', descricao text,
  capa text, detalhes text, sobre_autor text, ano int, editora text, localizacao text,
  disponivel boolean not null default true,
  created_at timestamptz default now()
);
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, descricao text, local text,
  data_hora timestamptz not null, created_at timestamptz default now()
);
create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  url text not null, path text, legenda text, descricao text, data date,
  created_at timestamptz default now()
);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 120),
  email text not null check (char_length(email) between 5 and 200),
  mensagem text not null check (char_length(mensagem) between 1 and 3000),
  created_at timestamptz default now()
);
alter table public.mensagens enable row level security;
create policy "enviar mensagem" on public.mensagens for insert to anon, authenticated with check (true);
create policy "admin le mensagens" on public.mensagens for select using (public.is_admin());
create policy "admin apaga mensagens" on public.mensagens for delete using (public.is_admin());

-- relatos de visitantes sobre o centro: só quem tem conta publica; autor e equipe podem apagar
create table public.relatos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  texto text not null check (char_length(texto) between 3 and 1000),
  created_at timestamptz default now()
);
create index on public.relatos (created_at desc);
alter table public.relatos enable row level security;
create policy "ler relatos" on public.relatos for select using (true);
create policy "publicar relato" on public.relatos for insert to authenticated with check (user_id = auth.uid() and public.can_post());
create policy "apagar relato" on public.relatos for delete using (user_id = auth.uid() or public.is_staff());

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


alter table public.profiles enable row level security;
alter table public.livros enable row level security;
alter table public.eventos enable row level security;
alter table public.fotos enable row level security;

create policy "perfil proprio" on public.profiles for select using (id = auth.uid());
create policy "admin ve perfis" on public.profiles for select using (public.is_admin());
-- só administrador muda permissões; ninguém tira o próprio acesso de administrador
create policy "admin altera perfis" on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin() and (id <> auth.uid() or (role = 'admin' and not bloqueado)));

-- leitura pública; escrita só para a equipe
create policy "ler livros" on public.livros for select using (true);
create policy "ler eventos" on public.eventos for select using (true);
create policy "ler fotos" on public.fotos for select using (true);

create policy "equipe livros" on public.livros for all using (public.is_staff()) with check (public.is_staff());
create policy "equipe eventos" on public.eventos for all using (public.is_staff()) with check (public.is_staff());
create policy "equipe fotos" on public.fotos for all using (public.is_staff()) with check (public.is_staff());

-- bucket público de fotos e capas
insert into storage.buckets (id, name, public) values ('fotos','fotos',true) on conflict (id) do nothing;

create policy "ler arquivos" on storage.objects for select using (bucket_id = 'fotos');
create policy "enviar fotos" on storage.objects for insert with check (bucket_id = 'fotos' and public.is_staff());
create policy "remover fotos" on storage.objects for delete using (bucket_id = 'fotos' and public.is_staff());

-- atividades do centro (aparecem na página "O Centro"; só a equipe edita)
create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 120),
  descricao text check (char_length(descricao) <= 600),
  ordem int not null default 0,
  created_at timestamptz default now()
);
alter table public.atividades enable row level security;
create policy "ler atividades" on public.atividades for select using (true);
create policy "equipe atividades" on public.atividades for all using (public.is_staff()) with check (public.is_staff());
insert into public.atividades (titulo, descricao, ordem) values
 ('Biblioteca e leitura', 'Consulta e leitura de livros sobre história, literatura e cultura afro-brasileira e africana.', 1),
 ('Exposição', 'Espaço de exposição sobre a cultura africana e afro-brasileira.', 2),
 ('Oficina de pintura em tecido', 'Criação de estampas e desenhos em tecido.', 3),
 ('Oficina de abayomis', 'Confecção das bonecas de pano abayomi, símbolo de afeto e resistência na cultura afro-brasileira.', 4),
 ('Música e dança', 'Vivências de música e dança de matriz afro-brasileira.', 5);

-- Depois de criar sua conta no site, torne-a administradora (depois disso, gerencie todo mundo pelo Painel):
-- update public.profiles set role = 'admin' where email = 'SEU-EMAIL';
