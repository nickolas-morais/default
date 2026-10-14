import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import { NovoJobForm } from '@/components/novo-job-form'
import { PageHeader } from '@/components/page-header'
import { urlFotoTalento } from '@/lib/foto'
import { escolheVendedor, podeCriarJob } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Novo job' }

export default async function NovoJobPage() {
  const { supabase, usuario } = await exigirSessao()
  if (!podeCriarJob(usuario.perfil)) redirect('/')

  const [marcas, talentos, pessoas] = await Promise.all([
    supabase.from('marcas').select('id, nome').order('nome'),
    supabase.from('talentos').select('id, nome, foto_path').eq('ativo', true).order('nome'),
    supabase.from('profiles').select('id, nome, perfil').eq('ativo', true).order('nome'),
  ])
  const lista = pessoas.data ?? []

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
          <li aria-current="page" className="text-ink">
            Novo job
          </li>
        </ol>
      </nav>
      <PageHeader titulo="Novo job" descricao="Ao criar o job, todas as áreas passam a vê-lo na matriz de status." />
      <NovoJobForm
        marcas={marcas.data ?? []}
        talentos={(talentos.data ?? []).map(({ foto_path, ...t }) => ({ ...t, foto: urlFotoTalento(foto_path) }))}
        vendedores={lista.filter((x) => x.perfil === 'analista_comercial' || x.perfil === 'diretora_comercial')}
        atendimento={lista.filter((x) => x.perfil === 'gerencia_atendimento' || x.perfil === 'analista_atendimento')}
        usuarioId={usuario.id}
        escolheVendedor={escolheVendedor(usuario.perfil)}
      />
    </>
  )
}
