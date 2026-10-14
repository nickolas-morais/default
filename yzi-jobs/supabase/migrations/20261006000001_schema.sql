-- =============================================================
-- YZI · Sistema de Gestão de Jobs — Fase 1
-- Migração 1: schema principal
-- Status são smallint (índice da etapa); os rótulos ficam em lib/status.ts
-- =============================================================

create extension if not exists pgcrypto;

create type public.perfil as enum (
  'diretoria_executiva',
  'diretora_comercial',
  'analista_comercial',
  'gerente_jaf',
  'analista_financeiro',
  'analista_juridico_adm',
  'diretora_estrategica',
  'gerencia_atendimento',
  'analista_atendimento'
);

create type public.tipo_arquivo as enum ('contrato', 'nf_yzi', 'nf_talento', 'outro');

-- -------------------------------------------------------------
-- Pessoas
-- -------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null,
  email       text not null unique,
  perfil      public.perfil not null,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.talentos (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null unique,
  analista_fixa_id  uuid references public.profiles (id) on delete set null,
  redes             text,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.marcas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Jobs
-- -------------------------------------------------------------
create sequence public.jobs_codigo_seq start 1001;

create table public.jobs (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique default ('J-' || nextval('public.jobs_codigo_seq')),
  marca_id         uuid not null references public.marcas (id),
  vigencia_inicio  date not null,
  vigencia_fim     date not null,
  alvara_exigido   boolean not null default false,
  alvara_status    smallint not null default 0 check (alvara_status between 0 and 2),
  alvara_validade  date,
  vendido_por      uuid not null references public.profiles (id),
  atendimento_id   uuid references public.profiles (id) on delete set null,
  jur_status       smallint not null default 0 check (jur_status between 0 and 3),
  adm_status       smallint not null default 0 check (adm_status between 0 and 2),
  nf_yzi_status    smallint not null default 0 check (nf_yzi_status between 0 and 3),
  est_status       smallint not null default 0 check (est_status between 0 and 2),
  observacoes      text,
  created_by       uuid references public.profiles (id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint vigencia_valida check (vigencia_fim >= vigencia_inicio)
);

-- Um job pode ter mais de um talento; cada talento emite a própria NF.
create table public.job_talentos (
  job_id      uuid not null references public.jobs (id) on delete cascade,
  talento_id  uuid not null references public.talentos (id),
  nf_status   smallint not null default 0 check (nf_status between 0 and 3),
  primary key (job_id, talento_id)
);

create table public.entregaveis (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null,
  talento_id     uuid not null,
  descricao      text not null,
  rede           text not null,
  data_prevista  date not null,
  status         smallint not null default 0 check (status between 0 and 4),
  publicado_em   date,
  ordem          integer not null default 0,
  created_at     timestamptz not null default now(),
  -- o talento do entregável precisa estar no job
  foreign key (job_id, talento_id) references public.job_talentos (job_id, talento_id) on delete cascade
);

-- Valores isolados: o RLS desta tabela é a regra mais sensível do sistema.
create table public.job_valores (
  job_id               uuid primary key references public.jobs (id) on delete cascade,
  valor_total          numeric(12, 2) not null check (valor_total >= 0),
  fee_yzi              numeric(12, 2) not null check (fee_yzi >= 0),
  condicoes_pagamento  text,
  updated_at           timestamptz not null default now(),
  constraint fee_menor_que_total check (fee_yzi <= valor_total)
);

create table public.arquivos (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs (id) on delete cascade,
  tipo          public.tipo_arquivo not null,
  talento_id    uuid references public.talentos (id),
  storage_path  text not null unique,
  nome          text not null,
  created_by    uuid references public.profiles (id) default auth.uid(),
  created_at    timestamptz not null default now()
);

create table public.historico (
  id              bigint generated always as identity primary key,
  job_id          uuid not null references public.jobs (id) on delete cascade,
  entregavel_id   uuid references public.entregaveis (id) on delete set null,
  talento_id      uuid references public.talentos (id) on delete set null,
  autor_id        uuid references public.profiles (id) on delete set null,
  campo           text not null,
  valor_anterior  text,
  valor_novo      text,
  created_at      timestamptz not null default now()
);

create table public.metas (
  analista_id  uuid not null references public.profiles (id) on delete cascade,
  ano          integer not null check (ano between 2020 and 2100),
  valor        numeric(12, 2) not null check (valor >= 0),
  primary key (analista_id, ano)
);

-- -------------------------------------------------------------
-- Índices
-- -------------------------------------------------------------
create index jobs_vendido_por_idx   on public.jobs (vendido_por);
create index jobs_marca_idx         on public.jobs (marca_id);
create index jobs_vigencia_fim_idx  on public.jobs (vigencia_fim);
create index job_talentos_tal_idx   on public.job_talentos (talento_id);
create index entregaveis_job_idx    on public.entregaveis (job_id, data_prevista);
create index entregaveis_data_idx   on public.entregaveis (data_prevista) where status < 4;
create index historico_job_idx      on public.historico (job_id, created_at desc);
create index arquivos_job_idx       on public.arquivos (job_id);

-- -------------------------------------------------------------
-- updated_at e publicado_em automáticos
-- -------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger trg_valores_updated_at before update on public.job_valores
  for each row execute function public.set_updated_at();

create or replace function public.set_publicado_em() returns trigger
language plpgsql as $$
begin
  if new.status = 4 and (tg_op = 'INSERT' or old.status is distinct from 4) then
    new.publicado_em := (now() at time zone 'America/Sao_Paulo')::date;
  elsif new.status < 4 then
    new.publicado_em := null;
  end if;
  return new;
end $$;

create trigger trg_entregaveis_publicado before insert or update of status on public.entregaveis
  for each row execute function public.set_publicado_em();
