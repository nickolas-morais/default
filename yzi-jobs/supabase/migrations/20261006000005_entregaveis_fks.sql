-- =============================================================
-- Migração 5: chaves diretas de entregaveis para jobs e talentos
-- A FK composta para job_talentos garante a regra, mas o PostgREST
-- só monta os embeds jobs → entregaveis e entregaveis → talentos/jobs
-- com FKs simples.
-- =============================================================

alter table public.entregaveis
  add constraint entregaveis_job_id_fkey
    foreign key (job_id) references public.jobs (id) on delete cascade,
  add constraint entregaveis_talento_id_fkey
    foreign key (talento_id) references public.talentos (id);

notify pgrst, 'reload schema';
