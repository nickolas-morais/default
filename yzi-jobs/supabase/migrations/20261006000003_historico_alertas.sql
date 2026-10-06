-- =============================================================
-- Migração 3: histórico automático, view de alertas e vendas por analista
-- =============================================================

-- -------------------------------------------------------------
-- Histórico (security definer: grava mesmo sem policy de insert)
-- -------------------------------------------------------------
create or replace function public.log_jobs() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c text;
  o jsonb;
  n jsonb := to_jsonb(new);
begin
  if tg_op = 'INSERT' then
    insert into public.historico (job_id, autor_id, campo, valor_novo)
    values (new.id, auth.uid(), 'job_criado', new.codigo);
    return new;
  end if;

  o := to_jsonb(old);
  foreach c in array array[
    'jur_status', 'adm_status', 'nf_yzi_status', 'est_status',
    'alvara_exigido', 'alvara_status', 'alvara_validade',
    'marca_id', 'vigencia_inicio', 'vigencia_fim', 'vendido_por', 'atendimento_id'
  ] loop
    if o -> c is distinct from n -> c then
      insert into public.historico (job_id, autor_id, campo, valor_anterior, valor_novo)
      values (new.id, auth.uid(), c, o ->> c, n ->> c);
    end if;
  end loop;
  return new;
end $$;

create trigger trg_hist_jobs after insert or update on public.jobs
  for each row execute function public.log_jobs();

create or replace function public.log_job_talentos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.nf_status is distinct from new.nf_status then
    insert into public.historico (job_id, talento_id, autor_id, campo, valor_anterior, valor_novo)
    values (new.job_id, new.talento_id, auth.uid(), 'nf_talento', old.nf_status::text, new.nf_status::text);
  end if;
  return new;
end $$;

create trigger trg_hist_job_talentos after update on public.job_talentos
  for each row execute function public.log_job_talentos();

create or replace function public.log_entregaveis() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.historico (job_id, entregavel_id, talento_id, autor_id, campo, valor_novo)
    values (new.job_id, new.id, new.talento_id, auth.uid(), 'entregavel_criado', new.descricao);
    return new;
  end if;
  if old.status is distinct from new.status then
    insert into public.historico (job_id, entregavel_id, talento_id, autor_id, campo, valor_anterior, valor_novo)
    values (new.job_id, new.id, new.talento_id, auth.uid(), 'entregavel_status', old.status::text, new.status::text);
  end if;
  if old.data_prevista is distinct from new.data_prevista then
    insert into public.historico (job_id, entregavel_id, talento_id, autor_id, campo, valor_anterior, valor_novo)
    values (new.job_id, new.id, new.talento_id, auth.uid(), 'entregavel_data', old.data_prevista::text, new.data_prevista::text);
  end if;
  return new;
end $$;

create trigger trg_hist_entregaveis after insert or update on public.entregaveis
  for each row execute function public.log_entregaveis();

-- Valores: registra QUE mudou, nunca o valor (o histórico é visível a todos)
create or replace function public.log_job_valores() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.historico (job_id, autor_id, campo)
  values (new.job_id, auth.uid(), case when tg_op = 'INSERT' then 'valores_definidos' else 'valores_alterados' end);
  return new;
end $$;

create trigger trg_hist_job_valores after insert or update on public.job_valores
  for each row execute function public.log_job_valores();

-- -------------------------------------------------------------
-- Alertas calculados em tempo real
-- Prazos ajustáveis em "params" (validar com a YZI)
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
where j.jur_status < 3
  and exists (select 1 from public.entregaveis e where e.job_id = j.id and e.status = 4)

union all
select j.id, null, 'alvara_pendente', 'juridico', 'critico',
       'Entrega em até ' || p.dias_alvara || ' dias com alvará pendente'
from public.jobs j cross join params p
where j.alvara_exigido and j.alvara_status < 2
  and exists (select 1 from public.entregaveis e
              where e.job_id = j.id and e.status < 4 and e.data_prevista <= p.hoje + p.dias_alvara)

union all
select j.id, null, 'nf_pendente', 'financeiro', 'atencao',
       'Entrega publicada há mais de ' || p.dias_nf || ' dias com NF pendente'
from public.jobs j cross join params p
where exists (select 1 from public.entregaveis e
              where e.job_id = j.id and e.status = 4 and e.publicado_em < p.hoje - p.dias_nf)
  and (j.nf_yzi_status < 1
       or exists (select 1 from public.job_talentos jt where jt.job_id = j.id and jt.nf_status < 1))

union all
select e.job_id, e.id, 'entrega_atrasada', 'atendimento', 'atencao',
       'Entrega atrasada: ' || e.descricao
from public.entregaveis e cross join params p
where e.status < 4 and e.data_prevista < p.hoje

union all
select j.id, null, 'vigencia_fim', 'comercial', 'atencao',
       'Vigência termina em ' || (j.vigencia_fim - p.hoje) || ' dias'
from public.jobs j cross join params p
where j.vigencia_fim between p.hoje and p.hoje + p.dias_vigencia;

-- -------------------------------------------------------------
-- Vendas por analista: herda o RLS de job_valores (a analista só soma as próprias)
-- -------------------------------------------------------------
create or replace view public.v_vendas_analista with (security_invoker = true) as
select j.vendido_por as analista_id,
       extract(year from j.created_at)::int as ano,
       count(*)::int as jobs,
       sum(v.valor_total) as valor_vendido
from public.jobs j
join public.job_valores v on v.job_id = j.id
group by j.vendido_por, extract(year from j.created_at);

grant select on public.v_alertas, public.v_vendas_analista to authenticated;
