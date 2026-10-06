import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { alertasPorJob, LINHA_MATRIZ } from '@/lib/dados'
import { lerVisaoMatriz, type VisaoMatriz } from '@/lib/status'
import type { Alerta, JobLinha } from '@/types/dominio'

// Consulta e filtros da matriz de status, usados pela tela e pela exportação (mesmo resultado nas duas).

export type BuscaMatriz = { q?: string; talento?: string; ver?: string; pagina?: string; por?: string }

/** Teto de segurança por consulta: a visão e o talento já filtram no banco antes. */
const TETO = 5000

export function nomeJob(j: { marca: { nome: string }; job_talentos: { talento: { nome: string } }[] }) {
  return `${j.job_talentos.map((t) => t.talento.nome).join(' + ')} × ${j.marca.nome}`
}

const SITUACAO_DA_VISAO: Partial<Record<VisaoMatriz, JobLinha['situacao']>> = {
  ativos: 'ativo',
  finalizados: 'finalizado',
  cancelados: 'cancelado',
}

/**
 * Visão e talento filtram no banco (o que mais reduz o volume com os anos);
 * a busca por texto (talento, marca, código) filtra o que voltou.
 * As contagens das abas vêm de consultas de contagem, sem carregar os jobs.
 */
export async function carregarMatriz(sb: SupabaseClient, busca: BuscaMatriz) {
  const visao = lerVisaoMatriz(busca.ver)

  const [resAlertas, resTalento, ...contagens] = await Promise.all([
    sb.from('v_alertas').select('*'),
    busca.talento ? sb.from('job_talentos').select('job_id').eq('talento_id', busca.talento) : null,
    ...(['ativo', 'finalizado', 'cancelado'] as const).map((s) => sb.from('jobs').select('id', { count: 'exact', head: true }).eq('situacao', s)),
  ])
  if (resAlertas.error) throw resAlertas.error
  const alertas = alertasPorJob(resAlertas.data as Alerta[])

  // ids que restringem a consulta (alerta e/ou talento); null = sem restrição por id
  let ids: string[] | null = null
  if (visao === 'alerta') ids = [...alertas.keys()]
  if (resTalento) {
    const doTalento = (resTalento.data ?? []).map((r) => r.job_id as string)
    ids = ids ? ids.filter((id) => doTalento.includes(id)) : doTalento
  }

  let jobs: JobLinha[] = []
  let truncado = false
  if (!ids || ids.length) {
    let q = sb.from('jobs').select(LINHA_MATRIZ).order('created_at', { ascending: false }).limit(TETO + 1)
    const situacao = SITUACAO_DA_VISAO[visao]
    if (situacao) q = q.eq('situacao', situacao)
    if (ids) q = q.in('id', ids)
    const { data, error } = await q
    if (error) throw error
    jobs = data as unknown as JobLinha[]
    truncado = jobs.length > TETO
    if (truncado) jobs = jobs.slice(0, TETO)
  }

  const termo = busca.q?.toLowerCase()
  const filtrados = termo ? jobs.filter((j) => `${nomeJob(j)} ${j.codigo}`.toLowerCase().includes(termo)) : jobs

  const [ativo, finalizado, cancelado] = contagens.map((c) => c.count ?? 0)
  const contagem: Record<VisaoMatriz, number> = {
    ativos: ativo,
    alerta: alertas.size,
    finalizados: finalizado,
    cancelados: cancelado,
    todos: ativo + finalizado + cancelado,
  }
  return { visao, contagem, filtrados, alertas, truncado }
}
