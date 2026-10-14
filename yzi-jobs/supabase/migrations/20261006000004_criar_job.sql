-- =============================================================
-- Migração 4: criação atômica de job (ficha + talentos + entregáveis + valores)
-- security invoker: todas as policies de RLS continuam valendo.
-- Se qualquer parte falhar, nada é gravado.
-- =============================================================

create or replace function public.criar_job(p jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_job   uuid;
  v_marca uuid := nullif(p ->> 'marca_id', '')::uuid;
  v_tal   text;
  e       jsonb;
begin
  if v_marca is null then
    if coalesce(trim(p ->> 'marca_nome'), '') = '' then
      raise exception 'Informe a marca' using errcode = '22023';
    end if;
    insert into public.marcas (nome) values (trim(p ->> 'marca_nome'))
    on conflict (nome) do update set nome = excluded.nome
    returning id into v_marca;
  end if;

  if jsonb_array_length(coalesce(p -> 'talentos', '[]'::jsonb)) = 0 then
    raise exception 'Selecione pelo menos um talento' using errcode = '22023';
  end if;

  insert into public.jobs (marca_id, vigencia_inicio, vigencia_fim, alvara_exigido,
                           vendido_por, atendimento_id, observacoes)
  values (v_marca,
          (p ->> 'vigencia_inicio')::date,
          (p ->> 'vigencia_fim')::date,
          coalesce((p ->> 'alvara_exigido')::boolean, false),
          (p ->> 'vendido_por')::uuid,
          nullif(p ->> 'atendimento_id', '')::uuid,
          nullif(trim(p ->> 'observacoes'), ''))
  returning id into v_job;

  for v_tal in select jsonb_array_elements_text(p -> 'talentos') loop
    insert into public.job_talentos (job_id, talento_id) values (v_job, v_tal::uuid);
  end loop;

  for e in select * from jsonb_array_elements(coalesce(p -> 'entregaveis', '[]'::jsonb)) loop
    insert into public.entregaveis (job_id, talento_id, descricao, rede, data_prevista, ordem)
    values (v_job, (e ->> 'talento_id')::uuid, e ->> 'descricao', e ->> 'rede',
            (e ->> 'data_prevista')::date, coalesce((e ->> 'ordem')::int, 0));
  end loop;

  if p ? 'valor_total' then
    insert into public.job_valores (job_id, valor_total, fee_yzi, condicoes_pagamento)
    values (v_job, (p ->> 'valor_total')::numeric, (p ->> 'fee_yzi')::numeric,
            nullif(trim(p ->> 'condicoes_pagamento'), ''));
  end if;

  return v_job;
end $$;

revoke execute on function public.criar_job(jsonb) from public, anon;
grant execute on function public.criar_job(jsonb) to authenticated;
