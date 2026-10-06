import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import { EditarJobForm, type JobEdicao } from '@/components/editar-job-form'
import { PageHeader } from '@/components/page-header'
import { urlFotoTalento } from '@/lib/foto'
import { podeEditarJob, podeTrocarVendedor } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'
import { ENT_PUBLICADO } from '@/lib/status'

export const metadata: Metadata = { title: 'Editar job' }

type Linha = Omit<JobEdicao, 'talentos' | 'travados'> & {
  situacao: string
  job_talentos: { nf_status: number; talento: { id: string; nome: string; foto_path: string | null } }[]
  entregaveis: { talento_id: string; status: number }[]
  arquivos: { talento_id: string | null }[]
}

export default async function EditarJobPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ supabase, usuario }, { id }] = await Promise.all([exigirSessao(), params])

  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id, codigo, situacao, marca_id, marca:marcas(nome), vigencia_inicio, vigencia_fim, alvara_exigido, vendido_por, atendimento_id, observacoes, job_talentos(nf_status, talento:talentos(id, nome, foto_path)), job_valores(valor_total, fee_yzi, condicoes_pagamento), entregaveis(talento_id, status), arquivos(talento_id)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) notFound()
  const job = data as unknown as Linha

  // só o Comercial responsável edita, e só job ativo (encerrado precisa ser reaberto antes)
  if (!podeEditarJob(usuario.perfil, job.vendido_por, usuario.id) || job.situacao !== 'ativo') redirect(`/jobs/${id}`)

  const [marcas, talentos, pessoas] = await Promise.all([
    supabase.from('marcas').select('id, nome').order('nome'),
    supabase.from('talentos').select('id, nome, foto_path').eq('ativo', true).order('nome'),
    supabase.from('profiles').select('id, nome, perfil').eq('ativo', true).order('nome'),
  ])

  // mesmas regras do trigger guard_remover_talento: o motivo aparece no cadeado do talento
  const travados: Record<string, string> = {}
  for (const jt of job.job_talentos) {
    const t = jt.talento.id
    if (jt.nf_status > 0) travados[t] = 'A NF deste talento já andou.'
    else if (job.entregaveis.some((e) => e.talento_id === t && e.status === ENT_PUBLICADO)) travados[t] = 'Tem entrega publicada.'
    else if (job.arquivos.some((a) => a.talento_id === t)) travados[t] = 'Tem arquivo anexado no job.'
  }

  // talentos do job continuam na lista mesmo se foram desativados depois
  const comFoto = ({ foto_path, ...t }: { id: string; nome: string; foto_path: string | null }) => ({ ...t, foto: urlFotoTalento(foto_path) })
  const doJob = job.job_talentos.map((jt) => comFoto(jt.talento))
  const lista = [...doJob, ...(talentos.data ?? []).filter((t) => !doJob.some((x) => x.id === t.id)).map(comFoto)].toSorted((a, b) =>
    a.nome.localeCompare(b.nome),
  )
  const equipe = pessoas.data ?? []

  return (
    <>
      <nav aria-label="Você está em" className="mb-4">
        <ol className="flex items-center gap-1.5 text-[13px] text-muted">
          <li>
            <Link href="/" className="rounded-sm hover:text-ink hover:underline">
              Matriz de status
            </Link>
          </li>
          <li aria-hidden="true">
            <CaretRightIcon size={12} />
          </li>
          <li>
            <Link href={`/jobs/${id}`} className="tabular rounded-sm hover:text-ink hover:underline">
              {job.codigo}
            </Link>
          </li>
          <li aria-hidden="true">
            <CaretRightIcon size={12} />
          </li>
          <li aria-current="page" className="text-ink">
            Editar
          </li>
        </ol>
      </nav>
      <PageHeader titulo={`Editar ${job.codigo}`} descricao="Ficha, valores e talentos. As entregas são editadas na própria ficha do job." />
      <EditarJobForm
        job={{ ...job, talentos: doJob.map((t) => t.id), travados }}
        marcas={marcas.data ?? []}
        talentos={lista}
        vendedores={equipe.filter((x) => x.perfil === 'analista_comercial' || x.perfil === 'diretora_comercial')}
        atendimento={equipe.filter((x) => x.perfil === 'gerencia_atendimento' || x.perfil === 'analista_atendimento')}
        trocaVendedor={podeTrocarVendedor(usuario.perfil)}
      />
    </>
  )
}
