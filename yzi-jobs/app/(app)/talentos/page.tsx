import type { Metadata } from 'next'
import { CarteiraTalentos, type CartaoTalento } from '@/components/carteira-talentos'
import { PageHeader } from '@/components/page-header'
import { diasAte, hojeSP } from '@/lib/format'
import { urlFotoTalento } from '@/lib/foto'
import { podeCriarJob } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'
import { ENT_PUBLICADO } from '@/lib/status'
import type { Situacao } from '@/types/dominio'

export const metadata: Metadata = { title: 'Talentos' }

type Linha = {
  id: string
  nome: string
  redes: string | null
  ativo: boolean
  analista_fixa_id: string | null
  foto_path: string | null
  analista: { nome: string } | null
  job_talentos: { job: { id: string; vigencia_fim: string; situacao: Situacao; marca: { nome: string }; job_talentos: { talento: { id: string; nome: string } }[] } }[]
}

export default async function TalentosPage() {
  const { supabase, usuario } = await exigirSessao()
  // mesmo critério da policy talentos_write: Comercial e diretoria alteram talentos
  const podeGerenciar = podeCriarJob(usuario.perfil)

  const [talentos, pendentes, alertas, pessoas] = await Promise.all([
    supabase
      .from('talentos')
      .select(
        'id, nome, redes, ativo, analista_fixa_id, foto_path, analista:profiles!talentos_analista_fixa_id_fkey(nome), job_talentos(job:jobs(id, vigencia_fim, situacao, marca:marcas(nome), job_talentos(talento:talentos(id, nome))))',
      )
      .eq('ativo', true)
      .order('nome'),
    // próxima entrega só de jobs ativos
    supabase
      .from('entregaveis')
      .select('talento_id, data_prevista, job:jobs!inner(situacao)')
      .eq('job.situacao', 'ativo')
      .lt('status', ENT_PUBLICADO)
      .order('data_prevista'),
    supabase.from('v_alertas').select('job_id, descricao'),
    supabase.from('profiles').select('id, nome').eq('ativo', true).in('perfil', ['analista_comercial', 'diretora_comercial']).order('nome'),
  ])
  if (talentos.error) throw talentos.error

  const proxima = new Map<string, string>()
  for (const e of pendentes.data ?? []) if (!proxima.has(e.talento_id)) proxima.set(e.talento_id, e.data_prevista)
  // motivos dos alertas por job, para o title do ícone no cartão
  const alertasPorJob = new Map<string, string[]>()
  for (const a of alertas.data ?? []) alertasPorJob.set(a.job_id, [...(alertasPorJob.get(a.job_id) ?? []), a.descricao])
  const hoje = hojeSP()

  // jobs mais recentes primeiro (pela data de fim da vigência)
  const cartoes: CartaoTalento[] = (talentos.data as unknown as Linha[]).map(({ analista, job_talentos, foto_path, ...t }) => {
    const jobsLista = job_talentos
      .map(({ job }) => ({
        id: job.id,
        marca: job.marca.nome,
        vigencia_fim: job.vigencia_fim,
        diasParaFim: diasAte(job.vigencia_fim, hoje),
        parceiros: job.job_talentos.filter((x) => x.talento.id !== t.id).map((x) => x.talento.nome),
        situacao: job.situacao,
        // encerrado: vigência terminou, ou o job foi finalizado/cancelado
        encerrado: job.vigencia_fim < hoje || job.situacao !== 'ativo',
        alertas: alertasPorJob.get(job.id) ?? [],
      }))
      .toSorted((a, b) => b.vigencia_fim.localeCompare(a.vigencia_fim))
    return { ...t, foto: urlFotoTalento(foto_path), jobs: jobsLista.length, analista: analista?.nome ?? null, proxima: proxima.get(t.id) ?? null, jobsLista }
  })

  return (
    <>
      <PageHeader titulo="Talentos" descricao="A carteira de cada talento: jobs, vigências e próxima entrega." />
      <CarteiraTalentos talentos={cartoes} analistas={pessoas.data ?? []} podeGerenciar={podeGerenciar} />
    </>
  )
}
