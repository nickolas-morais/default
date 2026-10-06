import type { Metadata } from 'next'
import { ChartLineUpIcon, LockSimpleIcon, DownloadSimpleIcon } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/page-header'
import { botaoClass } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/section'
import { brl, plural } from '@/lib/format'
import { urlFoto } from '@/lib/foto'
import { carregarMetas, percentual } from '@/lib/metas'
import { veAlgumValor } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Metas comerciais' }

export default async function MetasPage() {
  const { supabase, usuario } = await exigirSessao()
  if (!veAlgumValor(usuario.perfil)) {
    return (
      <>
        <PageHeader titulo="Metas comerciais" />
        <EmptyState titulo="Indisponível para o seu perfil" icone={LockSimpleIcon}>
          Metas envolvem valores e são restritas a quem tem alçada.
        </EmptyState>
      </>
    )
  }

  const ano = new Date().getFullYear()
  const linhas = await carregarMetas(supabase, ano)
  const foto = new Map(linhas.map((l) => [l.id, urlFoto(l.fotoPath)]))

  const somaMeta = linhas.reduce((s, l) => s + l.meta, 0)
  const somaVendido = linhas.reduce((s, l) => s + l.total, 0)
  const mostraTotal = linhas.length > 1

  return (
    <>
      <PageHeader
        titulo="Metas comerciais"
        descricao={`Vendido em ${ano}, a partir dos jobs fechados no ano. Jobs cancelados não contam.`}
        acao={
          linhas.length ? (
            // link comum (não next/link): é um download, não uma página
            <a href={`/exportar/metas?ano=${ano}`} download className={botaoClass('secundario')}>
              <DownloadSimpleIcon aria-hidden="true" size={16} />
              Exportar
            </a>
          ) : null
        }
      />
      {linhas.length === 0 ? (
        <EmptyState titulo={`Nenhuma meta cadastrada para ${ano}`} icone={ChartLineUpIcon}>
          A diretora comercial cadastra as metas de cada analista em Cadastros.
        </EmptyState>
      ) : (
        <>
          {mostraTotal ? (
            <dl className="mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
              <Resumo rotulo={`Vendido em ${ano}`} valor={brl(somaVendido)} />
              <Resumo rotulo="Meta da equipe" valor={brl(somaMeta)} />
              <Resumo rotulo="Atingido" valor={`${percentual(somaVendido, somaMeta).toLocaleString('pt-BR')}%`} />
            </dl>
          ) : null}

          <section aria-labelledby="por-analista" className="rounded-[10px] border border-line bg-surface">
            <h2 id="por-analista" className="border-b border-line px-5 py-3.5 text-[14.5px] font-semibold">
              Por analista
            </h2>
            <ul className="divide-y divide-line">
              {linhas.map((l) => {
                const p = percentual(l.total, l.meta)
                return (
                  <li key={l.id} className="grid grid-cols-1 items-center gap-3 px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)_220px] md:gap-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar nome={l.nome} foto={foto.get(l.id)} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.nome}</p>
                        <p className="tabular text-[12.5px] text-muted">{plural(l.jobs, 'job', 'jobs')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        role="progressbar"
                        aria-valuenow={Math.min(p, 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Meta de ${l.nome}`}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-idle-soft"
                      >
                        <div className={`h-full rounded-full ${p >= 100 ? 'bg-done' : 'bg-accent'}`} style={{ width: `${Math.min(p, 100)}%` }} />
                      </div>
                      <span className="tabular w-14 text-right text-[13.5px] font-semibold">{p.toLocaleString('pt-BR')}%</span>
                    </div>
                    <p className="tabular text-[13.5px] md:text-right">
                      <span className="font-medium">{brl(l.total)}</span> <span className="text-muted">de {brl(l.meta)}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
          {usuario.perfil === 'analista_comercial' ? (
            <p className="mt-3 text-[12.5px] text-muted">Analistas comerciais veem apenas a própria meta e as próprias vendas.</p>
          ) : null}
        </>
      )}
    </>
  )
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-[12.5px] text-muted">{rotulo}</dt>
      <dd className="tabular mt-0.5 text-[22px] font-semibold tracking-[-0.01em]">{valor}</dd>
    </div>
  )
}
