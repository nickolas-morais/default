-- =============================================================
-- Migração 2: perfis, RLS e guardas de escrita por área
-- Regra central: todos leem todos os jobs; valores só para quem tem alçada
-- ou para a analista comercial que vendeu o job.
-- =============================================================

-- -------------------------------------------------------------
-- Funções auxiliares (security definer: leem profiles sem recursão de RLS)
-- -------------------------------------------------------------
create or replace function public.meu_perfil() returns public.perfil
language sql stable security definer set search_path = '' as $$
  select perfil from public.profiles where id = auth.uid() and ativo
$$;

create or replace function public.usuario_ativo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo)
$$;

create or replace function public.tem_perfil(variadic perfis public.perfil[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.meu_perfil() = any (perfis), false)
$$;

-- Perfis que leem TODOS os valores
create or replace function public.ve_todos_valores() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'gerente_jaf', 'analista_financeiro')
$$;

-- Pode ver os valores deste job? (alçada geral ou foi quem vendeu)
create or replace function public.pode_ver_valores(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.ve_todos_valores()
      or exists (
        select 1 from public.jobs j
        where j.id = p_job
          and j.vendido_por = auth.uid()
          and public.tem_perfil('analista_comercial')
      )
$$;

-- Arquivos: NFs e contratos trazem valores, então seguem a mesma regra.
-- Contratos também ficam liberados para quem opera o Jurídico.
create or replace function public.pode_ver_arquivo(p_job uuid, p_tipo public.tipo_arquivo) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_tipo = 'outro' then public.usuario_ativo()
    when p_tipo = 'contrato' then public.pode_ver_valores(p_job) or public.tem_perfil('analista_juridico_adm')
    else public.pode_ver_valores(p_job)
  end
$$;

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.talentos     enable row level security;
alter table public.marcas       enable row level security;
alter table public.jobs         enable row level security;
alter table public.job_talentos enable row level security;
alter table public.entregaveis  enable row level security;
alter table public.job_valores  enable row level security;
alter table public.arquivos     enable row level security;
alter table public.historico    enable row level security;
alter table public.metas        enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (public.usuario_ativo());
create policy profiles_write on public.profiles for all to authenticated
  using (public.tem_perfil('diretoria_executiva'))
  with check (public.tem_perfil('diretoria_executiva'));

-- talentos e marcas: leitura geral, escrita pelo Comercial e diretoria
create policy talentos_select on public.talentos for select to authenticated using (public.usuario_ativo());
create policy talentos_write on public.talentos for all to authenticated
  using (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'))
  with check (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'));

create policy marcas_select on public.marcas for select to authenticated using (public.usuario_ativo());
create policy marcas_write on public.marcas for all to authenticated
  using (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'))
  with check (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'));

-- jobs: todos leem; Comercial cria; cada área altera a sua parte (ver guard_jobs)
create policy jobs_select on public.jobs for select to authenticated using (public.usuario_ativo());
create policy jobs_insert on public.jobs for insert to authenticated
  with check (
    public.tem_perfil('diretoria_executiva', 'diretora_comercial')
    or (public.tem_perfil('analista_comercial') and vendido_por = auth.uid())
  );
create policy jobs_update on public.jobs for update to authenticated
  using (public.usuario_ativo()) with check (public.usuario_ativo());
create policy jobs_delete on public.jobs for delete to authenticated
  using (public.tem_perfil('diretoria_executiva'));

-- job_talentos
create policy jt_select on public.job_talentos for select to authenticated using (public.usuario_ativo());
create policy jt_insert on public.job_talentos for insert to authenticated
  with check (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'));
create policy jt_update on public.job_talentos for update to authenticated
  using (public.usuario_ativo()) with check (public.usuario_ativo());
create policy jt_delete on public.job_talentos for delete to authenticated
  using (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'));

-- entregaveis
create policy ent_select on public.entregaveis for select to authenticated using (public.usuario_ativo());
create policy ent_insert on public.entregaveis for insert to authenticated
  with check (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial',
                                'gerencia_atendimento', 'analista_atendimento'));
create policy ent_update on public.entregaveis for update to authenticated
  using (public.usuario_ativo()) with check (public.usuario_ativo());
create policy ent_delete on public.entregaveis for delete to authenticated
  using (public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'gerencia_atendimento'));

-- job_valores: A REGRA CENTRAL
create policy job_valores_select on public.job_valores for select to authenticated
  using (public.pode_ver_valores(job_id));
create policy job_valores_write on public.job_valores for all to authenticated
  using (
    public.tem_perfil('diretoria_executiva', 'diretora_comercial')
    or (public.tem_perfil('analista_comercial')
        and exists (select 1 from public.jobs j where j.id = job_id and j.vendido_por = auth.uid()))
  )
  with check (
    public.tem_perfil('diretoria_executiva', 'diretora_comercial')
    or (public.tem_perfil('analista_comercial')
        and exists (select 1 from public.jobs j where j.id = job_id and j.vendido_por = auth.uid()))
  );

-- arquivos
create policy arquivos_select on public.arquivos for select to authenticated
  using (public.pode_ver_arquivo(job_id, tipo));
create policy arquivos_insert on public.arquivos for insert to authenticated
  with check (public.usuario_ativo() and created_by = auth.uid() and public.pode_ver_arquivo(job_id, tipo));
create policy arquivos_delete on public.arquivos for delete to authenticated
  using (public.tem_perfil('diretoria_executiva') or created_by = auth.uid());

-- historico: só leitura; gravação exclusiva pelas triggers
create policy historico_select on public.historico for select to authenticated using (public.usuario_ativo());

-- metas: quem vê todos os valores vê todas as metas; a analista vê a própria
create policy metas_select on public.metas for select to authenticated
  using (public.ve_todos_valores() or analista_id = auth.uid());
create policy metas_write on public.metas for all to authenticated
  using (public.tem_perfil('diretoria_executiva', 'diretora_comercial'))
  with check (public.tem_perfil('diretoria_executiva', 'diretora_comercial'));

-- -------------------------------------------------------------
-- Guardas de escrita por área
-- security invoker: current_user é 'authenticated' para usuários do app;
-- service_role (cron, importação) e postgres (migrações) passam direto.
-- -------------------------------------------------------------
create or replace function public.guard_jobs() returns trigger
language plpgsql set search_path = '' as $$
declare
  p public.perfil := public.meu_perfil();
  e_comercial boolean;
begin
  if current_user <> 'authenticated' then return new; end if;
  if p is null then raise exception 'Usuário sem perfil ativo' using errcode = '42501'; end if;
  if p = 'diretoria_executiva' then return new; end if;

  e_comercial := p = 'diretora_comercial' or (p = 'analista_comercial' and old.vendido_por = auth.uid());

  if (new.jur_status, new.adm_status, new.alvara_status, new.alvara_validade)
     is distinct from (old.jur_status, old.adm_status, old.alvara_status, old.alvara_validade)
     and p not in ('gerente_jaf', 'analista_juridico_adm') then
    raise exception 'Seu perfil não pode alterar Jurídico, Administrativo ou alvará' using errcode = '42501';
  end if;

  if new.nf_yzi_status is distinct from old.nf_yzi_status
     and p not in ('gerente_jaf', 'analista_financeiro') then
    raise exception 'Seu perfil não pode alterar a NF da YZI' using errcode = '42501';
  end if;

  if new.est_status is distinct from old.est_status and p <> 'diretora_estrategica' then
    raise exception 'Somente a Estratégia altera esta trilha' using errcode = '42501';
  end if;

  if (new.marca_id, new.vigencia_inicio, new.vigencia_fim, new.alvara_exigido, new.atendimento_id, new.observacoes)
     is distinct from (old.marca_id, old.vigencia_inicio, old.vigencia_fim, old.alvara_exigido, old.atendimento_id, old.observacoes)
     and not e_comercial then
    raise exception 'Somente o Comercial responsável altera a ficha do job' using errcode = '42501';
  end if;

  if new.vendido_por is distinct from old.vendido_por and p <> 'diretora_comercial' then
    raise exception 'Somente a diretora comercial transfere um job para outra analista' using errcode = '42501';
  end if;

  if (new.codigo, new.created_by, new.created_at) is distinct from (old.codigo, old.created_by, old.created_at) then
    raise exception 'Campos de controle não podem ser alterados' using errcode = '42501';
  end if;

  return new;
end $$;

create trigger trg_jobs_guard before update on public.jobs
  for each row execute function public.guard_jobs();

create or replace function public.guard_job_talentos() returns trigger
language plpgsql set search_path = '' as $$
declare p public.perfil := public.meu_perfil();
begin
  if current_user <> 'authenticated' then return new; end if;
  if p = 'diretoria_executiva' then return new; end if;
  if new.nf_status is distinct from old.nf_status and p not in ('gerente_jaf', 'analista_financeiro') then
    raise exception 'Seu perfil não pode alterar a NF do talento' using errcode = '42501';
  end if;
  if (new.job_id, new.talento_id) is distinct from (old.job_id, old.talento_id) then
    raise exception 'Para trocar o talento, remova e adicione novamente' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger trg_job_talentos_guard before update on public.job_talentos
  for each row execute function public.guard_job_talentos();

create or replace function public.guard_entregaveis() returns trigger
language plpgsql set search_path = '' as $$
declare
  p public.perfil := public.meu_perfil();
  e_atendimento boolean := p in ('gerencia_atendimento', 'analista_atendimento');
  e_comercial boolean;
begin
  if current_user <> 'authenticated' then return new; end if;
  if p = 'diretoria_executiva' then return new; end if;

  select p = 'diretora_comercial' or (p = 'analista_comercial' and j.vendido_por = auth.uid())
    into e_comercial
    from public.jobs j where j.id = old.job_id;

  if new.status is distinct from old.status and not e_atendimento then
    raise exception 'Somente o Atendimento altera o status das entregas' using errcode = '42501';
  end if;

  if (new.descricao, new.rede, new.data_prevista, new.talento_id, new.ordem)
     is distinct from (old.descricao, old.rede, old.data_prevista, old.talento_id, old.ordem)
     and not (e_atendimento or coalesce(e_comercial, false)) then
    raise exception 'Seu perfil não pode alterar este entregável' using errcode = '42501';
  end if;

  if new.job_id is distinct from old.job_id then
    raise exception 'Um entregável não pode mudar de job' using errcode = '42501';
  end if;

  return new;
end $$;

create trigger trg_entregaveis_guard before update on public.entregaveis
  for each row execute function public.guard_entregaveis();

-- -------------------------------------------------------------
-- Storage: bucket privado, caminho {job_id}/{tipo}/{arquivo}
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

create policy arquivos_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'arquivos'
    and public.pode_ver_arquivo(((storage.foldername(name))[1])::uuid,
                                ((storage.foldername(name))[2])::public.tipo_arquivo)
  );

create policy arquivos_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'arquivos'
    and public.pode_ver_arquivo(((storage.foldername(name))[1])::uuid,
                                ((storage.foldername(name))[2])::public.tipo_arquivo)
  );
