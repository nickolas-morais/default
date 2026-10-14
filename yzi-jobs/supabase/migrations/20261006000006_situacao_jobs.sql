-- =============================================================
-- Migração 6: situação do job (ativo, finalizado, cancelado)
-- - Finalizar, cancelar e reabrir: o mesmo Comercial que altera a ficha
--   (diretoria executiva, diretora comercial, analista que vendeu).
-- - Job finalizado ou cancelado fica travado: reabra para alterar.
-- - Encerrados não geram alertas; cancelados não contam nas vendas.
-- - Excluir continua só com a diretoria executiva (policy jobs_delete).
-- =============================================================

create type public.situacao_job as enum ('ativo', 'finalizado', 'cancelado');

alter table public.jobs
  add column situacao            public.situacao_job not null default 'ativo',
  add column encerrado_em        timestamptz,
  add column encerrado_por       uuid references public.profiles (id) on delete set null,
  add column motivo_cancelamento text;

create index jobs_situacao_idx on public.jobs (situacao);

-- -------------------------------------------------------------
-- Guarda da situação (separada de guard_jobs, que continua valendo)
-- -------------------------------------------------------------
create or replace function public.guard_situacao_job() returns trigger
language plpgsql set search_path = '' as $$
declare
  p public.perfil := public.meu_perfil();
begin
  if current_user <> 'authenticated' then return new; end if;

  if new.situacao is distinct from old.situacao then
    if not (p in ('diretoria_executiva', 'diretora_comercial')
            or (p = 'analista_comercial' and old.vendido_por = auth.uid())) then
      raise exception 'Somente o Comercial responsável finaliza, cancela ou reabre o job' using errcode = '42501';
    end if;

    if new.situacao = 'cancelado' and coalesce(trim(new.motivo_cancelamento), '') = '' then
      raise exception 'Informe o motivo do cancelamento' using errcode = '22023';
    end if;

    if new.situacao = 'ativo' then
      new.encerrado_em := null;
      new.encerrado_por := null;
      new.motivo_cancelamento := null;
    else
      new.encerrado_em := now();
      new.encerrado_por := auth.uid();
      if new.situacao = 'finalizado' then new.motivo_cancelamento := null; end if;
    end if;
    return new;
  end if;

  -- Sem mudança de situação: job encerrado não aceita outras alterações.
  if old.situacao <> 'ativo' and to_jsonb(new) - 'updated_at' is distinct from to_jsonb(old) - 'updated_at' then
    raise exception 'Este job está %. Reabra o job para alterar.', old.situacao using errcode = '42501';
  end if;

  if (new.encerrado_em, new.encerrado_por, new.motivo_cancelamento)
     is distinct from (old.encerrado_em, old.encerrado_por, old.motivo_cancelamento) then
    raise exception 'Campos de encerramento só mudam junto com a situação' using errcode = '42501';
  end if;

  return new;
end $$;

create trigger trg_jobs_situacao before update on public.jobs
  for each row execute function public.guard_situacao_job();

-- NF do talento e entregas também ficam travadas em job encerrado.
create or replace function public.exigir_job_ativo() returns trigger
language plpgsql set search_path = '' as $$
declare
  s public.situacao_job;
begin
  if current_user <> 'authenticated' then return new; end if;
  select situacao into s from public.jobs where id = old.job_id;
  if s <> 'ativo' then
    raise exception 'Este job está %. Reabra o job para alterar.', s using errcode = '42501';
  end if;
  return new;
end $$;

create trigger trg_job_talentos_ativo before update on public.job_talentos
  for each row execute function public.exigir_job_ativo();
create trigger trg_entregaveis_ativo before update on public.entregaveis
  for each row execute function public.exigir_job_ativo();

-- -------------------------------------------------------------
-- Histórico: registra finalizar, cancelar e reabrir
-- -------------------------------------------------------------
create or replace function public.log_situacao_job() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.situacao is distinct from old.situacao then
    insert into public.historico (job_id, autor_id, campo, valor_anterior, valor_novo)
    values (new.id, auth.uid(), 'situacao', old.situacao::text,
            case when new.situacao = 'cancelado' then 'cancelado: ' || new.motivo_cancelamento else new.situacao::text end);
  end if;
  return new;
end $$;

create trigger trg_hist_situacao after update on public.jobs
  for each row execute function public.log_situacao_job();

-- -------------------------------------------------------------
-- Alertas só de jobs ativos
-- -------------------------------------------------------------
create or replace view public.v_alertas with (security_invoker = true) as
with params as (
  select (now() at time zone 'America/Sao_Paulo')::date as hoje,
         14 as dias_alvara,
         10 as dias_nf,
         30 as dias_vigencia
)
select j.id as job_id, null::uuid as entregavel_id,
       'sem_contrato'::text as tipo, 'juridico'::text as area, 'critico'::text as severidade,
       'Conteúdo publicado sem contrato assinado'::text as descricao
from public.jobs j
where j.situacao = 'ativo' and j.jur_status < 3
  and exists (select 1 from public.entregaveis e where e.job_id = j.id and e.status = 4)

union all
select j.id, null, 'alvara_pendente', 'juridico', 'critico',
       'Entrega em até ' || p.dias_alvara || ' dias com alvará pendente'
from public.jobs j cross join params p
where j.situacao = 'ativo' and j.alvara_exigido and j.alvara_status < 2
  and exists (select 1 from public.entregaveis e
              where e.job_id = j.id and e.status < 4 and e.data_prevista <= p.hoje + p.dias_alvara)

union all
select j.id, null, 'nf_pendente', 'financeiro', 'atencao',
       'Entrega publicada há mais de ' || p.dias_nf || ' dias com NF pendente'
from public.jobs j cross join params p
where j.situacao = 'ativo'
  and exists (select 1 from public.entregaveis e
              where e.job_id = j.id and e.status = 4 and e.publicado_em < p.hoje - p.dias_nf)
  and (j.nf_yzi_status < 1
       or exists (select 1 from public.job_talentos jt where jt.job_id = j.id and jt.nf_status < 1))

union all
select e.job_id, e.id, 'entrega_atrasada', 'atendimento', 'atencao',
       'Entrega atrasada: ' || e.descricao
from public.entregaveis e
join public.jobs j on j.id = e.job_id and j.situacao = 'ativo'
cross join params p
where e.status < 4 and e.data_prevista < p.hoje

union all
select j.id, null, 'vigencia_fim', 'comercial', 'atencao',
       'Vigência termina em ' || (j.vigencia_fim - p.hoje) || ' dias'
from public.jobs j cross join params p
where j.situacao = 'ativo' and j.vigencia_fim between p.hoje and p.hoje + p.dias_vigencia;

-- -------------------------------------------------------------
-- Vendas: job cancelado não é venda
-- -------------------------------------------------------------
create or replace view public.v_vendas_analista with (security_invoker = true) as
select j.vendido_por as analista_id,
       extract(year from j.created_at)::int as ano,
       count(*)::int as jobs,
       sum(v.valor_total) as valor_vendido
from public.jobs j
join public.job_valores v on v.job_id = j.id
where j.situacao <> 'cancelado'
group by j.vendido_por, extract(year from j.created_at);

notify pgrst, 'reload schema';
