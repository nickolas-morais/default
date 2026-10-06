'use client'

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Select } from '@/components/ui/field'

export const OPCOES_POR_PAGINA = [6, 12, 24] as const

/** Página atual dentro dos limites (ex.: depois de um filtro que reduz a lista). */
export function paginar<T>(itens: T[], pagina: number, porPagina: number) {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina))
  const atual = Math.min(Math.max(1, pagina), totalPaginas)
  const inicio = (atual - 1) * porPagina
  return { itens: itens.slice(inicio, inicio + porPagina), atual, totalPaginas, inicio }
}

export function Paginacao({
  total,
  pagina,
  totalPaginas,
  porPagina,
  inicio,
  rotulo,
  opcoes = OPCOES_POR_PAGINA,
  aoMudarPagina,
  aoMudarPorPagina,
}: {
  total: number
  pagina: number
  totalPaginas: number
  porPagina: number
  inicio: number
  /** Nome dos itens no plural, ex.: "talentos". */
  rotulo: string
  /** Quantidades oferecidas no seletor; a primeira é o mínimo para os controles aparecerem. */
  opcoes?: readonly number[]
  aoMudarPagina: (p: number) => void
  aoMudarPorPagina: (n: number) => void
}) {
  const fim = Math.min(inicio + porPagina, total)
  const botao =
    'grid size-8 place-items-center rounded-md border border-line-strong bg-surface text-ink hover:bg-sunken disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav aria-label={`Paginação de ${rotulo}`} className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] text-muted">
      <p className="tabular" aria-live="polite">
        {total === 0 ? `0 ${rotulo}` : `${inicio + 1} a ${fim} de ${total} ${rotulo}`}
      </p>

      {/* com poucos itens, os controles só atrapalham */}
      {total > opcoes[0] ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="flex items-center gap-2">
            Por página
            <Select compacto value={porPagina} onChange={(e) => aoMudarPorPagina(Number(e.target.value))} className="w-[76px]">
              {opcoes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" className={botao} disabled={pagina <= 1} onClick={() => aoMudarPagina(pagina - 1)} aria-label="Página anterior">
              <CaretLeftIcon aria-hidden="true" size={14} weight="bold" />
            </button>
            <span className="tabular min-w-[92px] text-center text-ink">
              Página {pagina} de {totalPaginas}
            </span>
            <button type="button" className={botao} disabled={pagina >= totalPaginas} onClick={() => aoMudarPagina(pagina + 1)} aria-label="Próxima página">
              <CaretRightIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
