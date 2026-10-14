-- =============================================================
-- Migração 10: histórico de mudanças na equipe
-- - Quem mudou nome, e-mail, perfil ou acesso de quem, e quando.
-- - Mudanças feitas pela tela (usuário logado): registradas por trigger.
-- - Convite e exclusão (feitos pela service role): registrados pela própria ação do app,
--   que sabe quem pediu. O trigger ignora a service role para não duplicar.
-- - Só a diretoria executiva lê.
-- =============================================================

create table public.historico_equipe (
  id              bigint generated always as identity primary key,
  -- quem foi alterado; o nome fica em alvo_nome para continuar legível se a pessoa for excluída
  alvo_id         uuid references public.profiles (id) on delete set null,
  alvo_nome       text not null,
  autor_id        uuid references public.profiles (id) on delete set null,
  campo           text not null,
  valor_anterior  text,
  valor_novo      text,
  created_at      timestamptz not null default now()
);

create index historico_equipe_data_idx on public.historico_equipe (created_at desc);

alter table public.historico_equipe enable row level security;
create policy historico_equipe_select on public.historico_equipe for select to authenticated
  using (public.tem_perfil('diretoria_executiva'));
-- sem policy de insert: gravação só pelo trigger (security definer) e pela service role

create or replace function public.log_equipe() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
begin
  if current_user = 'service_role' or auth.uid() is null then return new; end if;
  foreach c in array array['nome', 'email', 'perfil', 'ativo'] loop
    if o -> c is distinct from n -> c then
      insert into public.historico_equipe (alvo_id, alvo_nome, autor_id, campo, valor_anterior, valor_novo)
      values (new.id, new.nome, auth.uid(), c, o ->> c, n ->> c);
    end if;
  end loop;
  return new;
end $$;

create trigger trg_hist_equipe after update on public.profiles
  for each row execute function public.log_equipe();

notify pgrst, 'reload schema';
