import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon, CheckCircleIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/ui/section'
import { plural } from '@/lib/format'
import { exigirSessao } from '@/lib/sessao'
import type { Alerta } from '@/types/dominio'

export const metadata: Metadata = { title: 'Alertas' }

const AREA = { juridico: 'Jurídico', financeiro: 'Financeiro', atendimento: 'Atendimento', comercial: 'Comercial' } as const

type JobMini = { id: string; codigo: string; marca: { nome: string }; job_talentos: { talento: { nome: string } }[] }

const GRUPOS = [
  { severidade: 'critico', titulo: 'Críticos', Icone: WarningCircleIcon, cor: 'text-crit' },
  { severidade: 'atencao', titulo: 'Atenção', Icone: WarningIcon, cor: 'text-prog' },
] as const

export default async function AlertasPage() {
  const { supabase } = await exigirSessao()
  const { data } = await supabase.from('v_alertas').select('*')
  const alertas = (data ?? []) as Alerta[]

  const ids = [...new Set(alertas.map((a) => a.job_id))]
  const { data: jobs } = ids.length
    ? await supabase.from('jobs').select('id, codigo, marca:marcas(nome), job_talentos(talento:talentos(nome))').in('id', ids)
    : { data: [] }
  const porId = new Map(((jobs ?? []) as unknown as JobMini[]).map((j) => [j.id, j]))

  return (
    <>
      <PageHeader
        titulo="Alertas"
        descricao="Situações que precisam de atenção. Prazos: alvará 14 dias antes da entrega, NF 10 dias após a publicação, vigência 30 dias antes do fim."
      />
      {alertas.length === 0 ? (
        <EmptyState titulo="Nenhum alerta aberto" icone={CheckCircleIcon}>
          Tudo em dia por enquanto.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          {GRUPOS.map(({ severidade, titulo, Icone, cor }) => {
            const lista = alertas.filter((a) => a.severidade === severidade)
            if (!lista.length) return null
            return (
              <section key={severidade} aria-labelledby={`sev-${severidade}`}>
                <h2 id={`sev-${severidade}`} className="mb-2.5 flex items-baseline gap-2 text-[14.5px] font-semibold">
                  {titulo}
                  <span className="tabular text-[13px] font-normal text-muted">{plural(lista.length, 'alerta', 'alertas')}</span>
                </h2>
                <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
                  {lista.map((a) => {
                    const j = porId.get(a.job_id)
                    return (
                      <li key={`${a.job_id}-${a.tipo}-${a.entregavel_id ?? ''}`}>
                        <Link href={`/jobs/${a.job_id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-sunken/60">
                          <Icone aria-hidden="true" size={18} weight="fill" className={`mt-px shrink-0 ${cor}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">
                              <span className="sr-only">{severidade === 'critico' ? 'Crítico: ' : 'Atenção: '}</span>
                              {a.descricao}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] text-muted">
                              {j ? `${j.job_talentos.map((t) => t.talento.nome).join(' + ')} × ${j.marca.nome}, ${j.codigo}` : 'Job'}
                            </span>
                          </span>
                          <span className="hidden shrink-0 rounded-md bg-sunken px-2 py-0.5 text-[12px] font-medium text-muted sm:inline">{AREA[a.area]}</span>
                          <CaretRightIcon aria-hidden="true" size={14} className="mt-1 shrink-0 text-muted" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
