import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Alerta, Arquivo, ItemHistorico, JobDetalhe, JobLinha } from '@/types/dominio'

// Os embeds de job_valores voltam null quando o RLS não libera os valores.

/** Colunas de cada linha da matriz (ver lib/matriz.ts). */
export const LINHA_MATRIZ = `
  id, codigo, situacao, vigencia_fim, alvara_exigido, alvara_status,
  jur_status, adm_status, nf_yzi_status, est_status,
  marca:marcas(nome),
  vendedor:profiles!jobs_vendido_por_fkey(nome),
  job_talentos(nf_status, talento:talentos(id, nome)),
  entregaveis(id, status, data_prevista),
  job_valores(valor_total)
`

export function alertasPorJob(lista: Alerta[]) {
  const mapa = new Map<string, Alerta[]>()
  for (const a of lista) {
    const atual = mapa.get(a.job_id)
    if (atual) atual.push(a)
    else mapa.set(a.job_id, [a])
  }
  return mapa
}

const DETALHE = `
  id, codigo, vigencia_inicio, vigencia_fim, alvara_exigido, alvara_status, alvara_validade,
  jur_status, adm_status, nf_yzi_status, est_status, observacoes, vendido_por,
  situacao, encerrado_em, motivo_cancelamento,
  encerrador:profiles!jobs_encerrado_por_fkey(nome),
  marca:marcas(nome),
  vendedor:profiles!jobs_vendido_por_fkey(nome),
  atendimento:profiles!jobs_atendimento_id_fkey(nome),
  job_talentos(nf_status, talento:talentos(id, nome, foto_path)),
  entregaveis(id, descricao, rede, data_prevista, status, publicado_em, ordem, talento:talentos(id, nome)),
  job_valores(valor_total, fee_yzi, condicoes_pagamento)
`

export async function obterJob(sb: SupabaseClient, id: string) {
  const [job, historico, arquivos, alertas] = await Promise.all([
    sb
      .from('jobs')
      .select(DETALHE)
      .eq('id', id)
      .order('data_prevista', { referencedTable: 'entregaveis' })
      .maybeSingle(),
    sb
      .from('historico')
      .select(
        'id, campo, valor_anterior, valor_novo, created_at, autor:profiles!historico_autor_id_fkey(nome, foto_path), talento:talentos(nome), entregavel:entregaveis(descricao)',
      )
      .eq('job_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    sb.from('arquivos').select('id, tipo, nome, created_at, created_by, autor:profiles!arquivos_created_by_fkey(nome), talento:talentos(nome)').eq('job_id', id).order('created_at'),
    sb.from('v_alertas').select('*').eq('job_id', id),
  ])
  if (job.error) throw job.error
  if (!job.data) return null
  return {
    job: job.data as unknown as JobDetalhe,
    historico: (historico.data ?? []) as unknown as ItemHistorico[],
    arquivos: (arquivos.data ?? []) as unknown as Arquivo[],
    alertas: (alertas.data ?? []) as Alerta[],
  }
}

export async function contarAlertas(sb: SupabaseClient) {
  const { count, error } = await sb.from('v_alertas').select('*', { count: 'exact', head: true })
  // o menu não deve quebrar a tela inteira, mas a falha precisa aparecer no log
  if (error) console.error('contarAlertas', error)
  return count ?? 0
}
