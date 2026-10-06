'use client'

import Link from 'next/link'
import { useDeferredValue, useRef, useState } from 'react'
import { CalendarBlankIcon, CaretRightIcon, MagnifyingGlassIcon, UserIcon, UsersThreeIcon, WarningCircleIcon, type Icon } from '@phosphor-icons/react'
import { AcoesTalento, type TalentoLinha } from '@/components/talentos-lista'
import { Avatar } from '@/components/ui/avatar'
import { inputClass } from '@/components/ui/field'
import { SelectBusca } from '@/components/ui/select-busca'
import { paginar, Paginacao } from '@/components/ui/paginacao'
import { EmptyState } from '@/components/ui/section'
import { data } from '@/lib/format'
import { SITUACAO_LABEL } from '@/lib/status'
import type { Situacao } from '@/types/dominio'

type Opcao = { id: string; nome: string }
export type JobDoTalento = {
  id: string
  marca: string
  vigencia_fim: string
  /** Outros talentos do mesmo job (job em conjunto). */
  parceiros: string[]
  situacao: Situacao
  /** Vigência terminou, ou o job foi finalizado/cancelado. */
  encerrado: boolean
  /** Motivos dos alertas abertos do job (vazio = sem alerta). */
  alertas: string[]
  /** Dias até o fim da vigência (negativo = já terminou). */
  diasParaFim: number
}
export type CartaoTalento = TalentoLinha & { analista: string | null; proxima: string | null; jobsLista: JobDoTalento[] }

type Filtro = 'todos' | 'vigentes' | 'alerta'
// múltiplos de 4 e 3: a grade fecha certinho em 4, 3 ou 2 colunas
const OPCOES = [8, 12, 24] as const

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function CarteiraTalentos({
  talentos,
  analistas,
  podeGerenciar,
}: {
  talentos: CartaoTalento[]
  analistas: Opcao[]
  /** Comercial e diretoria: mostra o menu de ações em cada cartão. */
  podeGerenciar: boolean
}) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [analista, setAnalista] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState<number>(OPCOES[0])
  const termo = normalizar(useDeferredValue(busca).trim())
  const topo = useRef<HTMLDivElement>(null)

  const vigentes = (t: CartaoTalento) => t.jobsLista.some((j) => !j.encerrado)
  const comAlerta = (t: CartaoTalento) => t.jobsLista.some((j) => j.alertas.length > 0)
  const contagem = { todos: talentos.length, vigentes: talentos.filter(vigentes).length, alerta: talentos.filter(comAlerta).length }

  const visiveis = talentos.filter((t) => {
    if (filtro === 'vigentes' && !vigentes(t)) return false
    if (filtro === 'alerta' && !comAlerta(t)) return false
    if (analista && (analista === '-' ? t.analista_fixa_id : t.analista_fixa_id !== analista)) return false
    // busca também pelas marcas: "quem trabalha com a Natura?"
    return !termo || normalizar(`${t.nome} ${t.redes ?? ''} ${t.jobsLista.map((j) => `${j.marca} ${j.parceiros.join(' ')}`).join(' ')}`).includes(termo)
  })
  const pag = paginar(visiveis, pagina, porPagina)

  function mudar<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v)
      setPagina(1)
    }
  }

  function irPara(p: number) {
    setPagina(p)
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    topo.current?.scrollIntoView({ block: 'start', behavior: suave ? 'smooth' : 'auto' })
  }

  const aba = (ativa: boolean) =>
    `inline-flex min-h-8 items-center gap-1.5 rounded-[5px] px-3 text-[13px] font-medium transition-colors motion-reduce:transition-none ${
      ativa ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]' : 'text-muted hover:text-ink'
    }`

  if (talentos.length === 0) {
    return (
      <EmptyState titulo="Nenhum talento na carteira" icone={UsersThreeIcon}>
        Os talentos são cadastrados pelo Comercial ou pela diretoria, em Cadastros.
      </EmptyState>
    )
  }

  return (
    <>
      <div ref={topo} className="mb-4 flex scroll-mt-6 flex-wrap items-center gap-3">
        <div role="group" aria-label="Mostrar" className="inline-flex rounded-md bg-sunken p-0.5">
          {(
            [
              ['todos', 'Todos'],
              ['vigentes', 'Com job vigente'],
              ['alerta', 'Com alerta'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => mudar(setFiltro)(valor)} className={aba(filtro === valor)}>
              {rotulo}
              <span className={`tabular ${valor === 'alerta' && contagem.alerta > 0 ? 'text-crit' : 'text-muted'}`}>{contagem[valor]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-[1_1_240px] sm:max-w-xs">
          <label htmlFor="busca-carteira" className="sr-only">
            Buscar
          </label>
          <MagnifyingGlassIcon aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="busca-carteira"
            type="search"
            autoComplete="off"
            value={busca}
            onChange={(e) => mudar(setBusca)(e.target.value)}
            placeholder="Buscar talento, rede ou marca…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <label htmlFor="filtro-analista" className="sr-only">
          Filtrar por analista fixa
        </label>
        <div className="w-full sm:w-56">
          <SelectBusca
            id="filtro-analista"
            opcoes={[{ id: '-', nome: 'Sem analista definida' }, ...analistas]}
            valor={analista}
            aoMudar={mudar(setAnalista)}
            vazio="Todas as analistas"
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState titulo="Nenhum talento com esses filtros" icone={MagnifyingGlassIcon}>
          Limpe a busca ou escolha outro filtro para ver os demais talentos.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {pag.itens.map((t) => (
            <Cartao key={t.id} talento={t} analistas={analistas} podeGerenciar={podeGerenciar} />
          ))}
        </ul>
      )}

      {visiveis.length > 0 ? (
        <Paginacao
          total={visiveis.length}
          pagina={pag.atual}
          totalPaginas={pag.totalPaginas}
          porPagina={porPagina}
          inicio={pag.inicio}
          rotulo={visiveis.length === 1 ? 'talento' : 'talentos'}
          opcoes={OPCOES}
          aoMudarPagina={irPara}
          aoMudarPorPagina={mudar(setPorPagina)}
        />
      ) : null}
    </>
  )
}

function Cartao({ talento: t, analistas, podeGerenciar }: { talento: CartaoTalento; analistas: Opcao[]; podeGerenciar: boolean }) {
  const vigentes = t.jobsLista.filter((j) => !j.encerrado).length
  return (
    <li className="flex min-w-0 flex-col rounded-[10px] border border-line bg-surface">
      <header className="flex items-center gap-3 px-5 pb-4 pt-5">
        <Avatar nome={t.nome} foto={t.foto} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15.5px] font-semibold">{t.nome}</h2>
          <p className="truncate text-[12.5px] text-muted">{t.redes || 'Redes não informadas'}</p>
        </div>
        {podeGerenciar ? (
          <div className="-mr-2 self-start">
            <AcoesTalento talento={t} analistas={analistas} />
          </div>
        ) : null}
      </header>

      {/* uma linha por informação: o valor ganha a largura do cartão em vez de disputar uma coluna estreita */}
      <dl className="flex flex-col gap-2 border-y border-line px-5 py-3 text-[13px]">
        <Linha icone={UserIcon} rotulo="Analista fixa">
          {t.analista ?? <span className="font-normal text-muted">A definir</span>}
        </Linha>
        <Linha icone={CalendarBlankIcon} rotulo="Próxima entrega">
          {t.proxima ? <span className="tabular">{data(t.proxima)}</span> : <span className="font-normal text-muted">Nenhuma</span>}
        </Linha>
      </dl>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-3">
        <p className="flex items-baseline justify-between px-3 pb-1 text-[12.5px] text-muted">
          <span className="font-medium text-ink">Jobs</span>
          {t.jobsLista.length ? <span className="tabular">{vigentes === 1 ? '1 vigente' : `${vigentes} vigentes`}</span> : null}
        </p>
        {t.jobsLista.length ? (
          <ul className="flex flex-col">
            {t.jobsLista.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className={`flex min-h-10 items-start gap-2 rounded-md px-3 py-2 text-[13.5px] hover:bg-sunken ${j.encerrado ? 'text-muted' : ''}`}>
                  {j.alertas.length ? (
                    // o motivo aparece no mouse (title) e é lido pelo leitor de tela (aria-label)
                    <span title={j.alertas.join('\n')} className="mt-0.5 shrink-0">
                      <WarningCircleIcon role="img" aria-label={`Alerta: ${j.alertas.join('; ')}`} size={15} weight="fill" className="text-crit" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{j.marca}</span>
                    {j.parceiros.length ? (
                      <span className="block truncate text-[12px] text-muted">com {listaNomes(j.parceiros)}</span>
                    ) : null}
                  </span>
                  <PrazoJob job={j} />
                  <CaretRightIcon aria-hidden="true" size={12} className="mt-1 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 pb-2 text-[13px] text-muted">Nenhum job ainda.</p>
        )}
      </div>
    </li>
  )
}

/** Situação ou prazo da vigência; perto do fim (30 dias), conta os dias em âmbar. */
function PrazoJob({ job: j }: { job: JobDoTalento }) {
  const base = 'tabular mt-px shrink-0 text-right text-[12px]'
  if (j.situacao !== 'ativo') return <span className={`${base} text-muted`}>{SITUACAO_LABEL[j.situacao]}</span>
  if (j.encerrado) return <span className={`${base} text-muted`}>Vigência encerrada</span>
  if (j.diasParaFim <= 30) {
    return (
      <span title={`Vigência até ${data(j.vigencia_fim)}`} className={`${base} font-medium text-prog`}>
        {j.diasParaFim === 0 ? 'Termina hoje' : j.diasParaFim === 1 ? 'Termina amanhã' : `Termina em ${j.diasParaFim} dias`}
      </span>
    )
  }
  return <span className={`${base} text-muted`}>Vigência até {data(j.vigencia_fim)}</span>
}

function Linha({ icone: Icone, rotulo, children }: { icone: Icon; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-muted">
        <Icone aria-hidden="true" size={14} />
        {rotulo}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  )
}

/** "Ana", "Ana e Bia", "Ana, Bia e Carla". */
function listaNomes(nomes: string[]) {
  return nomes.length <= 1 ? (nomes[0] ?? '') : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
}
