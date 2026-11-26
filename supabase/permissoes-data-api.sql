-- Execute no SQL Editor do Supabase em um banco que já tenha o schema do site.
-- As políticas de segurança por linha do schema continuam controlando cada ação.
begin;

grant select on public.livros, public.eventos, public.fotos, public.atividades, public.relatos
  to anon, authenticated;
grant insert, update, delete on public.livros, public.eventos, public.fotos, public.atividades
  to authenticated;
grant insert, delete on public.relatos to authenticated;

grant select on public.profiles to authenticated;
grant update (role, bloqueado) on public.profiles to authenticated;

grant insert on public.mensagens to anon, authenticated;
grant select, delete on public.mensagens to authenticated;

commit;
