-- =============================================================
-- Migração 11: correções da validação de segurança
-- Encontradas atacando a API direto (scripts/testar-acesso.mts):
-- 1. Criar job/entrega/talento do job aceitava campos de outras áreas já preenchidos
--    (as guardas por perfil só valiam para UPDATE).
-- 2. Um registro de arquivo podia apontar para a pasta de outro job no Storage.
-- E proteções novas:
-- 3. Bucket "arquivos" com limite de tamanho e de tipo.
-- 4. Limite de tentativas (login, "esqueci minha senha", troca de senha, exportação).
-- =============================================================

-- -------------------------------------------------------------
-- 1. Guardas de INSERT: na criação, campos de outras áreas nascem no valor inicial.
--    Vale para a tela (criar_job é security invoker) e para quem chamar a API direto.
--    service_role e migrações passam direto (importação da planilha).
-- -------------------------------------------------------------
create or replace function public.guard_insert_jobs() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  new.jur_status := 0;
  new.adm_status := 0;
  new.nf_yzi_status := 0;
  new.est_status := 0;
  new.alvara_status := 0;
  new.alvara_validade := null;
  new.situacao := 'ativo';
  new.encerrado_em := null;
  new.encerrado_por := null;
  new.motivo_cancelamento := null;
  -- código sempre da sequência: reaproveita o número que o default acabou de gerar
  -- (sem pular números); se o código veio na requisição, o default não rodou e pega o próximo
  begin
    if new.codigo is distinct from 'J-' || currval('public.jobs_codigo_seq') then
      new.codigo := 'J-' || nextval('public.jobs_codigo_seq');
    end if;
  exception when object_not_in_prerequisite_state then
    new.codigo := 'J-' || nextval('public.jobs_codigo_seq');
  end;
  new.created_by := auth.uid();
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

create trigger trg_jobs_guard_insert before insert on public.jobs
  for each row execute function public.guard_insert_jobs();

-- NF do talento começa em "Aguardando autorização"; quem avança é o Financeiro (por update).
create or replace function public.guard_insert_job_talentos() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  new.nf_status := 0;
  return new;
end $$;

create trigger trg_job_talentos_guard_insert before insert on public.job_talentos
  for each row execute function public.guard_insert_job_talentos();

-- Entrega nasce em "Briefing", exceto quando o próprio Atendimento (ou a diretoria) a cria.
create or replace function public.guard_insert_entregaveis() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if not public.tem_perfil('diretoria_executiva', 'gerencia_atendimento', 'analista_atendimento') then
    new.status := 0;
    new.publicado_em := null;
  end if;
  return new;
end $$;

-- o nome começa com "trg_entregaveis_0" para rodar antes de trg_entregaveis_publicado (ordem alfabética)
create trigger trg_entregaveis_0_guard_insert before insert on public.entregaveis
  for each row execute function public.guard_insert_entregaveis();

-- -------------------------------------------------------------
-- 2. Arquivo só aponta para a pasta do próprio job e do próprio tipo: {job_id}/{tipo}/...
-- -------------------------------------------------------------
alter table public.arquivos
  add constraint arquivos_caminho_do_job check (storage_path like job_id::text || '/' || tipo::text || '/%');

-- -------------------------------------------------------------
-- 3. Bucket de contratos e NFs: até 9 MB, só PDF, XML, PNG e JPG
-- -------------------------------------------------------------
update storage.buckets
set file_size_limit = 9437184,
    allowed_mime_types = array['application/pdf', 'application/xml', 'text/xml', 'image/png', 'image/jpeg']
where id = 'arquivos';

-- -------------------------------------------------------------
-- 4. Limite de tentativas (usado pelo servidor da aplicação com a service role)
-- -------------------------------------------------------------
create table public.limite_tentativas (
  chave      text not null,
  criado_em  timestamptz not null default now()
);
create index limite_tentativas_chave_idx on public.limite_tentativas (chave, criado_em);
create index limite_tentativas_data_idx on public.limite_tentativas (criado_em);
-- RLS sem policies: nenhum usuário lê nem grava; só a service role
alter table public.limite_tentativas enable row level security;

/** Registra uma tentativa e diz se ainda está dentro do limite (p_max por p_janela_segundos). */
create or replace function public.registrar_tentativa(p_chave text, p_max integer, p_janela_segundos integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
begin
  -- faxina: nada aqui precisa durar mais de um dia
  delete from public.limite_tentativas where criado_em < now() - interval '1 day';
  select count(*) into v_total from public.limite_tentativas
  where chave = p_chave and criado_em > now() - make_interval(secs => p_janela_segundos);
  if v_total >= p_max then return false; end if;
  insert into public.limite_tentativas (chave) values (p_chave);
  return true;
end $$;

revoke execute on function public.registrar_tentativa(text, integer, integer) from public, anon, authenticated;
grant execute on function public.registrar_tentativa(text, integer, integer) to service_role;

notify pgrst, 'reload schema';
