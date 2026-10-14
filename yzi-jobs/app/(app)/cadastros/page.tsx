import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MetaForm } from '@/components/cadastros'
import { MarcasLista, type MarcaLinha } from '@/components/marcas-lista'
import { PageHeader } from '@/components/page-header'
import { TalentosLista, type TalentoLinha } from '@/components/talentos-lista'
import { FormSection } from '@/components/ui/form-section'
import { urlFotoTalento } from '@/lib/foto'
import { podeCriarJob } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Cadastros' }

type Supabase = Awaited<ReturnType<typeof exigirSessao>>['supabase']
type Aba = 'talentos' | 'marcas' | 'metas'

export default async function CadastrosPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const [{ supabase, usuario }, busca] = await Promise.all([exigirSessao(), searchParams])
  if (!podeCriarJob(usuario.perfil)) redirect('/')
  const editaMetas = usuario.perfil === 'diretoria_executiva' || usuario.perfil === 'diretora_comercial'
  const aba: Aba = busca.aba === 'marcas' ? 'marcas' : busca.aba === 'metas' && editaMetas ? 'metas' : 'talentos'

  return (
    <>
      <PageHeader titulo="Cadastros" descricao="Talentos, marcas e metas comerciais usados nos jobs." />

      <nav aria-label="Cadastros" className="mb-6 flex gap-6 border-b border-line">
        <LinkAba href="/cadastros" atual={aba === 'talentos'}>
          Talentos
        </LinkAba>
        <LinkAba href="/cadastros?aba=marcas" atual={aba === 'marcas'}>
          Marcas
        </LinkAba>
        {editaMetas ? (
          <LinkAba href="/cadastros?aba=metas" atual={aba === 'metas'}>
            Metas
          </LinkAba>
        ) : null}
      </nav>

      {aba === 'talentos' ? <AbaTalentos supabase={supabase} /> : aba === 'marcas' ? <AbaMarcas supabase={supabase} /> : <AbaMetas supabase={supabase} />}
    </>
  )
}

async function analistasAtivas(supabase: Supabase) {
  const { data } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('ativo', true)
    .in('perfil', ['analista_comercial', 'diretora_comercial'])
    .order('nome')
  return data ?? []
}

async function AbaTalentos({ supabase }: { supabase: Supabase }) {
  // todos os talentos, inclusive inativos, para poder reativar; job_talentos(count) diz se pode excluir
  const [talentos, analistas] = await Promise.all([
    supabase.from('talentos').select('id, nome, redes, ativo, analista_fixa_id, foto_path, job_talentos(count)').order('nome'),
    analistasAtivas(supabase),
  ])
  if (talentos.error) throw talentos.error
  const lista: TalentoLinha[] = talentos.data.map(({ job_talentos, foto_path, ...t }) => ({
    ...t,
    foto: urlFotoTalento(foto_path),
    jobs: (job_talentos as unknown as { count: number }[])[0]?.count ?? 0,
  }))
  return <TalentosLista talentos={lista} analistas={analistas} />
}

async function AbaMarcas({ supabase }: { supabase: Supabase }) {
  const { data, error } = await supabase.from('marcas').select('id, nome, created_at, jobs(count)').order('nome')
  if (error) throw error
  const lista: MarcaLinha[] = data.map(({ jobs, created_at, ...m }) => ({
    ...m,
    criada_em: created_at,
    jobs: (jobs as unknown as { count: number }[])[0]?.count ?? 0,
  }))
  return <MarcasLista marcas={lista} />
}

async function AbaMetas({ supabase }: { supabase: Supabase }) {
  const analistas = await analistasAtivas(supabase)
  return (
    <FormSection titulo="Metas por analista" descricao="Uma meta por analista e por ano. Salvar de novo substitui o valor.">
      <MetaForm analistas={analistas} ano={new Date().getFullYear()} />
    </FormSection>
  )
}

function LinkAba({ href, atual, children }: { href: string; atual: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={atual ? 'page' : undefined}
      className="-mb-px border-b-2 border-transparent pb-2.5 text-[14px] font-medium text-muted hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
    >
      {children}
    </Link>
  )
}
