-- =============================================================
-- Migração 7: edição do job
-- - Talentos do job: só o Comercial responsável inclui/remove (antes: qualquer analista comercial).
-- - Entregas: analista comercial só inclui nos jobs que vendeu.
-- - Job encerrado: também não aceita incluir/remover talentos e entregas.
-- - Remover talento: só sem NF andando, sem entrega publicada e sem arquivo dele; o job fica com 1+.
-- - Entrega publicada não pode ser excluída.
-- - editar_job(p): ficha + valores + talentos numa transação só.
-- =============================================================

-- -------------------------------------------------------------
-- Policies mais justas
-- -------------------------------------------------------------
create or replace function public.e_comercial_do_job(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.tem_perfil('diretoria_executiva', 'diretora_comercial')
      or (public.tem_perfil('analista_comercial')
          and exists (select 1 from public.jobs j where j.id = p_job and j.vendido_por = auth.uid()))
$$;

drop policy jt_insert on public.job_talentos;
drop policy jt_delete on public.job_talentos;
create policy jt_insert on public.job_talentos for insert to authenticated
  with check (public.e_comercial_do_job(job_id));
create policy jt_delete on public.job_talentos for delete to authenticated
  using (public.e_comercial_do_job(job_id));

drop policy ent_insert on public.entregaveis;
create policy ent_insert on public.entregaveis for insert to authenticated
  with check (public.e_comercial_do_job(job_id)
              or public.tem_perfil('gerencia_atendimento', 'analista_atendimento'));

-- -------------------------------------------------------------
-- Job encerrado: nada entra nem sai.
-- Quando o próprio job está sendo excluído (cascata), ele já não existe: deixa passar.
-- -------------------------------------------------------------
create or replace function public.exigir_job_ativo_ins_del() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_job uuid := case when tg_op = 'DELETE' then old.job_id else new.job_id end;
  s public.situacao_job;
begin
  if current_user <> 'authenticated' then return coalesce(new, old); end if;
  select situacao into s from public.jobs where id = v_job;
  if s is not null and s <> 'ativo' then
    raise exception 'Este job está %. Reabra o job para alterar.', s using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_job_talentos_ativo_ins_del before insert or delete on public.job_talentos
  for each row execute function public.exigir_job_ativo_ins_del();
create trigger trg_entregaveis_ativo_ins_del before insert or delete on public.entregaveis
  for each row execute function public.exigir_job_ativo_ins_del();

-- -------------------------------------------------------------
-- Remover talento do job
-- -------------------------------------------------------------
create or replace function public.guard_remover_talento() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return old; end if;
  -- cascata da exclusão do job: o job já não existe
  if not exists (select 1 from public.jobs where id = old.job_id) then return old; end if;

  if old.nf_status > 0 then
    raise exception 'A NF deste talento já andou. Ele não pode sair do job.' using errcode = '42501';
  end if;
  if exists (select 1 from public.entregaveis e where e.job_id = old.job_id and e.talento_id = old.talento_id and e.status = 4) then
    raise exception 'Este talento tem entrega publicada. Ele não pode sair do job.' using errcode = '42501';
  end if;
  if exists (select 1 from public.arquivos a where a.job_id = old.job_id and a.talento_id = old.talento_id) then
    raise exception 'Este talento tem arquivo anexado no job. Ele não pode sair do job.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.job_talentos jt where jt.job_id = old.job_id and jt.talento_id <> old.talento_id) then
    raise exception 'O job precisa ter pelo menos um talento.' using errcode = '22023';
  end if;
  return old;
end $$;

create trigger trg_job_talentos_remover before delete on public.job_talentos
  for each row execute function public.guard_remover_talento();

-- -------------------------------------------------------------
-- Excluir entrega: nunca a publicada
-- -------------------------------------------------------------
create or replace function public.guard_excluir_entregavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return old; end if;
  if not exists (select 1 from public.jobs where id = old.job_id) then return old; end if;
  -- remoção do talento leva as entregas dele junto: o guard do talento já barrou as publicadas
  if old.status = 4 then
    raise exception 'Entrega publicada não pode ser excluída.' using errcode = '42501';
  end if;
  return old;
end $$;

create trigger trg_entregaveis_excluir before delete on public.entregaveis
  for each row execute function public.guard_excluir_entregavel();

-- -------------------------------------------------------------
-- Histórico: talento adicionado/removido, entrega removida
-- (inclusões feitas junto com a criação do job não são registradas: o "criou o job" já cobre)
-- -------------------------------------------------------------
create or replace function public.log_talento_job() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid := case when tg_op = 'DELETE' then old.job_id else new.job_id end;
  v_criado timestamptz;
  v_nome text;
begin
  select created_at into v_criado from public.jobs where id = v_job;
  if v_criado is null or v_criado = now() then return coalesce(new, old); end if;
  select nome into v_nome from public.talentos where id = coalesce(new.talento_id, old.talento_id);
  insert into public.historico (job_id, talento_id, autor_id, campo, valor_novo)
  values (v_job, coalesce(new.talento_id, old.talento_id), auth.uid(),
          case when tg_op = 'DELETE' then 'talento_removido' else 'talento_adicionado' end, v_nome);
  return coalesce(new, old);
end $$;

create trigger trg_hist_talento_job after insert or delete on public.job_talentos
  for each row execute function public.log_talento_job();

create or replace function public.log_entregavel_removido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.jobs where id = old.job_id) then return old; end if;
  insert into public.historico (job_id, talento_id, autor_id, campo, valor_anterior)
  values (old.job_id, old.talento_id, auth.uid(), 'entregavel_removido', old.descricao);
  return old;
end $$;

create trigger trg_hist_entregavel_removido after delete on public.entregaveis
  for each row execute function public.log_entregavel_removido();

-- -------------------------------------------------------------
-- editar_job: ficha + valores + talentos, tudo ou nada.
-- security invoker: policies e guards continuam valendo para quem chama.
-- -------------------------------------------------------------
create or replace function public.editar_job(p jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  v_job   uuid := (p ->> 'id')::uuid;
  v_marca uuid := nullif(p ->> 'marca_id', '')::uuid;
  v_tal   uuid;
begin
  if v_marca is null then
    if coalesce(trim(p ->> 'marca_nome'), '') = '' then
      raise exception 'Informe a marca' using errcode = '22023';
    end if;
    insert into public.marcas (nome) values (trim(p ->> 'marca_nome'))
    on conflict (nome) do update set nome = excluded.nome
    returning id into v_marca;
  end if;

  update public.jobs set
    marca_id        = v_marca,
    vigencia_inicio = (p ->> 'vigencia_inicio')::date,
    vigencia_fim    = (p ->> 'vigencia_fim')::date,
    alvara_exigido  = coalesce((p ->> 'alvara_exigido')::boolean, false),
    atendimento_id  = nullif(p ->> 'atendimento_id', '')::uuid,
    observacoes     = nullif(trim(p ->> 'observacoes'), ''),
    -- só muda se veio no pedido (a guarda de jobs confere quem pode transferir)
    vendido_por     = coalesce(nullif(p ->> 'vendido_por', '')::uuid, vendido_por)
  where id = v_job;
  if not found then
    raise exception 'Job não encontrado' using errcode = '22023';
  end if;

  if p ? 'valor_total' then
    insert into public.job_valores as v (job_id, valor_total, fee_yzi, condicoes_pagamento)
    values (v_job, (p ->> 'valor_total')::numeric, (p ->> 'fee_yzi')::numeric, nullif(trim(p ->> 'condicoes_pagamento'), ''))
    on conflict (job_id) do update
      set valor_total = excluded.valor_total, fee_yzi = excluded.fee_yzi, condicoes_pagamento = excluded.condicoes_pagamento
      -- sem mudança, sem linha no histórico
      where (v.valor_total, v.fee_yzi, v.condicoes_pagamento)
            is distinct from (excluded.valor_total, excluded.fee_yzi, excluded.condicoes_pagamento);
  end if;

  if p ? 'talentos' then
    if jsonb_array_length(p -> 'talentos') = 0 then
      raise exception 'O job precisa ter pelo menos um talento.' using errcode = '22023';
    end if;
    -- inclui primeiro, remove depois: a regra "pelo menos um talento" olha o que sobra
    for v_tal in select (jsonb_array_elements_text(p -> 'talentos'))::uuid loop
      insert into public.job_talentos (job_id, talento_id) values (v_job, v_tal)
      on conflict (job_id, talento_id) do nothing;
    end loop;
    delete from public.job_talentos
    where job_id = v_job
      and talento_id not in (select (jsonb_array_elements_text(p -> 'talentos'))::uuid);
  end if;
end $$;

revoke execute on function public.editar_job(jsonb) from public, anon;
grant execute on function public.editar_job(jsonb) to authenticated;

notify pgrst, 'reload schema';
