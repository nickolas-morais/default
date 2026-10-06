import type { Metadata } from 'next'
import Link from 'next/link'
import { DownloadSimpleIcon, FunnelSimpleIcon, PlusIcon, SquaresFourIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr'
import { FiltrosMatriz } from '@/components/filtros-matriz'
import { ResultadoMatriz, TransicaoMatriz } from '@/components/matriz-transicao'
import { PaginacaoMatriz } from '@/components/paginacao-matriz'
import { PageHeader } from '@/components/page-header'
import { botaoClass, ButtonLink } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/pill'
import { EmptyState } from '@/components/ui/section'
import { NaoSeAplica, NfTalentosCompacto, StatusCompacto } from '@/components/ui/status-compacto'
import { Valor } from '@/components/valor'
import { data, plural } from '@/lib/format'
import { podeCriarJob, veAlgumValor } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'
import { carregarMatriz, nomeJob, type BuscaMatriz } from '@/lib/matriz'
import { ENT_PUBLICADO, OPCOES_MATRIZ, prontoParaFinalizar, SITUACAO_LABEL, type VisaoMatriz } from '@/lib/status'
import type { JobLinha } from '@/types/dominio'

export const metadata: Metadata = { title: 'Matriz de status' }


export default async function MatrizPage({ searchParams }: { searchParams: Promise<BuscaMatriz> }) {
  const [{ supabase, usuario }, busca] = await Promise.all([exigirSessao(), searchParams])
  const [{ visao, contagem, filtrados, alertas, truncado }, talentos] = await Promise.all([
    carregarMatriz(supabase, busca),
    // lista do filtro: todos os talentos (os jobs carregados agora são só os da visão)
    supabase.from('talentos').select('id, nome').order('nome'),
  ])
  const comValor = veAlgumValor(usuario.perfil)
  const listaTalentos = talentos.data ?? []

  // paginação na URL (?pagina=, ?por=)
  const porPagina = (OPCOES_MATRIZ as readonly number[]).includes(Number(busca.por)) ? Number(busca.por) : OPCOES_MATRIZ[0]
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const pagina = Math.min(Math.max(1, Number(busca.pagina) || 1), totalPaginas)
  const daPagina = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina)
  const novoJob = podeCriarJob(usuario.perfil) ? (
    <ButtonLink href="/jobs/novo">
      <PlusIcon aria-hidden="true" size={16} weight="bold" />
      Novo job
    </ButtonLink>
  ) : null

  return (
    <>
      <PageHeader
        titulo="Matriz de status"
        descricao="O andamento de cada job em todas as áreas."
        acao={
          <>
            {filtrados.length ? (
              // link comum (não next/link): é um download; leva os filtros da tela
              <a href={`/exportar/matriz${exportarQuery(busca)}`} download className={botaoClass('secundario')}>
                <DownloadSimpleIcon aria-hidden="true" size={16} />
                Exportar
              </a>
            ) : null}
            {novoJob}
          </>
        }
      />

      {contagem.todos === 0 ? (
        <EmptyState titulo="Nenhum job cadastrado ainda" icone={SquaresFourIcon} acao={novoJob}>
          Cada job fechado pelo Comercial aparece aqui, com a situação de cada área.
        </EmptyState>
      ) : (
        <TransicaoMatriz>
          <FiltrosMatriz talentos={listaTalentos} contagem={contagem} />
          <ResultadoMatriz>
            {filtrados.length === 0 ? (
              <EmptyState
                titulo={VAZIO[visao] && !busca.q && !busca.talento ? VAZIO[visao] : 'Nenhum job com esses filtros'}
                icone={FunnelSimpleIcon}
              >
                {busca.q || busca.talento
                  ? 'Limpe a busca ou escolha outro talento para ver os demais jobs.'
                  : 'Escolha outra visão acima para ver os demais jobs.'}
              </EmptyState>
            ) : (
              <>
                <Tabela jobs={daPagina} alertas={alertas} comValor={comValor} />
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
                  {daPagina.map((j) => (
                    <CartaoJob key={j.id} job={j} temAlerta={alertas.has(j.id)} comValor={comValor} />
                  ))}
                </ul>
              </>
            )}
            {filtrados.length ? (
              <PaginacaoMatriz total={filtrados.length} pagina={pagina} porPagina={porPagina} totalPaginas={totalPaginas} />
            ) : null}
            {truncado ? (
              <p role="status" className="mt-2 text-[12.5px] text-prog">
                Mostrando os 5.000 jobs mais recentes desta visão. Use a busca ou o filtro de talento para encontrar os demais.
              </p>
            ) : null}
          </ResultadoMatriz>
        </TransicaoMatriz>
      )}
    </>
  )
}

const VAZIO: Partial<Record<VisaoMatriz, string>> = {
  ativos: 'Nenhum job ativo',
  alerta: 'Nenhum job com alerta',
  finalizados: 'Nenhum job finalizado',
  cancelados: 'Nenhum job cancelado',
}

/** Com 3+ talentos: "Ana, Bia e mais 2 × Natura" (a busca continua usando o nome completo). */
function nomeCurto(j: { marca: { nome: string }; job_talentos: { talento: { nome: string } }[] }) {
  const nomes = j.job_talentos.map((t) => t.talento.nome)
  if (nomes.length <= 2) return nomeJob(j)
  return `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2} × ${j.marca.nome}`
}

function resumoEntregas(j: JobLinha) {
  const publicadas = j.entregaveis.filter((e) => e.status === ENT_PUBLICADO).length
  const proxima = j.entregaveis
    .filter((e) => e.status < ENT_PUBLICADO)
    .reduce<string | null>((min, e) => (min === null || e.data_prevista < min ? e.data_prevista : min), null)
  return { publicadas, total: j.entregaveis.length, proxima }
}

function TituloJob({ job: j, temAlerta }: { job: JobLinha; temAlerta: boolean }) {
  return (
    <Link href={`/jobs/${j.id}`} className="block min-w-0 rounded-sm">
      <span className="flex items-start gap-1.5 font-medium text-ink hover:text-accent">
        {temAlerta ? <WarningCircleIcon aria-label="Tem alerta" role="img" size={16} weight="fill" className="mt-0.5 shrink-0 text-crit" /> : null}
        <span className="min-w-0 break-words" title={j.job_talentos.length > 2 ? nomeJob(j) : undefined}>
          {nomeCurto(j)}
        </span>
      </span>
      <span className="mt-0.5 block truncate text-[12.5px] text-muted">
        <span className="tabular">{j.codigo}</span> · {j.vendedor.nome}
      </span>
      <SeloSituacao job={j} />
    </Link>
  )
}

/** Finalizado, Cancelado ou "Pronto para finalizar"; nada para o caso comum (ativo em andamento). */
function SeloSituacao({ job: j }: { job: JobLinha }) {
  if (j.situacao !== 'ativo') {
    return (
      <span
        className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${j.situacao === 'finalizado' ? 'bg-done-soft text-done' : 'bg-sunken text-muted'}`}
      >
        {SITUACAO_LABEL[j.situacao]}
      </span>
    )
  }
  if (!prontoParaFinalizar(j)) return null
  return (
    <span className="mt-1.5 inline-flex rounded-md bg-accent-soft px-1.5 py-0.5 text-[11.5px] font-medium text-accent">Pronto para finalizar</span>
  )
}

/* ---------- Telas largas: matriz compacta, sem rolagem lateral a partir de 1280px ---------- */

const COLUNAS: { titulo: string; abrev?: string }[] = [
  { titulo: 'Jurídico' },
  { titulo: 'Administrativo', abrev: 'Adm.' },
  { titulo: 'NF da YZI', abrev: 'NF YZI' },
  { titulo: 'NF do talento', abrev: 'NF talento' },
  { titulo: 'Entregas' },
  { titulo: 'Estratégia' },
  { titulo: 'Alvará' },
]

function Tabela({ jobs, alertas, comValor }: { jobs: JobLinha[]; alertas: Map<string, unknown>; comValor: boolean }) {
  return (
    <div className="hidden overflow-x-auto rounded-[10px] border border-line bg-surface xl:block">
      <table className="w-full table-fixed border-collapse text-[13.5px]">
        <caption className="sr-only">Status de cada área por job</caption>
        <colgroup>
          <col className="min-w-[200px]" />
          {COLUNAS.map((c) => (
            <col key={c.titulo} className="w-[92px]" />
          ))}
          {comValor ? <col className="w-[112px]" /> : null}
        </colgroup>
        <thead>
          <tr className="border-b border-line bg-sunken text-left text-[12.5px] text-muted">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Job
            </th>
            {COLUNAS.map((c) => (
              <th key={c.titulo} scope="col" className="truncate px-2.5 py-2.5 font-medium">
                {c.abrev ? (
                  <abbr title={c.titulo} className="no-underline">
                    {c.abrev}
                  </abbr>
                ) : (
                  c.titulo
                )}
              </th>
            ))}
            {comValor ? (
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Valor
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <LinhaJob key={j.id} job={j} temAlerta={alertas.has(j.id)} comValor={comValor} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LinhaJob({ job: j, temAlerta, comValor }: { job: JobLinha; temAlerta: boolean; comValor: boolean }) {
  const { publicadas, total, proxima } = resumoEntregas(j)
  const varios = j.job_talentos.length > 1
  const celula = 'px-2.5 py-3'

  return (
    <tr className="border-b border-line align-top last:border-0 hover:bg-sunken/60 [content-visibility:auto]">
      <td className="px-4 py-3">
        <TituloJob job={j} temAlerta={temAlerta} />
      </td>
      <td className={celula}>
        <StatusCompacto trilha="jur" valor={j.jur_status} />
      </td>
      <td className={celula}>
        <StatusCompacto trilha="adm" valor={j.adm_status} />
      </td>
      <td className={celula}>
        <StatusCompacto trilha="nf" valor={j.nf_yzi_status} />
      </td>
      <td className={celula}>
        {varios ? (
          <NfTalentosCompacto
            talentos={j.job_talentos.map((jt) => ({
              nome: jt.talento.nome,
              nf_status: jt.nf_status,
            }))}
          />
        ) : (
          <StatusCompacto trilha="nf" valor={j.job_talentos[0]?.nf_status ?? 0} />
        )}
      </td>
      <td className={celula}>
        {total ? (
          <span title={proxima ? `Próxima entrega em ${data(proxima)}` : 'Todas publicadas'} className="flex flex-col gap-1">
            <span aria-hidden="true" className="flex h-1 overflow-hidden rounded-full bg-idle-soft">
              <span className="bg-done" style={{ width: `${(publicadas / total) * 100}%` }} />
            </span>
            <span className="tabular text-[12.5px]">
              <span className="font-medium">{publicadas}</span>
              <span className="text-muted">/{total}</span>
              {proxima ? <span className="text-muted"> · {data(proxima).slice(0, 5)}</span> : null}
            </span>
            <span className="sr-only">
              {publicadas} de {total} publicadas
              {proxima ? `, próxima em ${data(proxima)}` : ''}
            </span>
          </span>
        ) : (
          <NaoSeAplica texto="Sem entregas" />
        )}
      </td>
      <td className={celula}>
        <StatusCompacto trilha="est" valor={j.est_status} />
      </td>
      <td className={celula}>{j.alvara_exigido ? <StatusCompacto trilha="alv" valor={j.alvara_status} /> : <NaoSeAplica texto="Não exige" />}</td>
      {comValor ? (
        <td className="px-4 py-3 text-right text-[13px]">
          <Valor valor={j.job_valores?.valor_total} />
        </td>
      ) : null}
    </tr>
  )
}

/* ---------- Telas menores: um cartão por job ---------- */

function CartaoJob({ job: j, temAlerta, comValor }: { job: JobLinha; temAlerta: boolean; comValor: boolean }) {
  const { publicadas, total, proxima } = resumoEntregas(j)
  const varios = j.job_talentos.length > 1

  return (
    <li className="flex min-w-0 flex-col rounded-[10px] border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <TituloJob job={j} temAlerta={temAlerta} />
        {comValor ? (
          <span className="shrink-0 text-[13px]">
            <Valor valor={j.job_valores?.valor_total} />
          </span>
        ) : null}
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 px-4 py-3 text-[13px] sm:grid-cols-2">
        <Area rotulo="Jurídico">
          <StatusPill trilha="jur" valor={j.jur_status} />
        </Area>
        <Area rotulo="Administrativo">
          <StatusPill trilha="adm" valor={j.adm_status} />
        </Area>
        <Area rotulo="NF da YZI">
          <StatusPill trilha="nf" valor={j.nf_yzi_status} />
        </Area>
        {j.job_talentos.map((jt) => (
          <Area key={jt.talento.id} rotulo={varios ? `NF de ${jt.talento.nome}` : 'NF do talento'}>
            <StatusPill trilha="nf" valor={jt.nf_status} />
          </Area>
        ))}
        <Area rotulo="Entregas">
          {total ? (
            <span className="tabular">
              {publicadas} de {total} publicadas
              {proxima ? <span className="block text-[12px] text-muted">Próxima em {data(proxima)}</span> : null}
            </span>
          ) : (
            <span className="text-muted">Sem entregas</span>
          )}
        </Area>
        <Area rotulo="Estratégia">
          <StatusPill trilha="est" valor={j.est_status} />
        </Area>
        <Area rotulo="Alvará">
          {j.alvara_exigido ? <StatusPill trilha="alv" valor={j.alvara_status} /> : <span className="text-muted">Não exige</span>}
        </Area>
      </dl>
    </li>
  )
}

function Area({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="truncate text-[12px] text-muted">{rotulo}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function exportarQuery(busca: BuscaMatriz) {
  const p = new URLSearchParams()
  for (const k of ['ver', 'talento', 'q'] as const) if (busca[k]) p.set(k, busca[k])
  return p.size ? `?${p}` : ''
}
