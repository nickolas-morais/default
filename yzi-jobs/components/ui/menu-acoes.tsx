'use client'

import { useEffect, useId, useRef } from 'react'
import { DotsThreeIcon, InfoIcon, type Icon } from '@phosphor-icons/react'

export type Acao = {
  rotulo: string
  icone: Icon
  aoClicar: () => void
  perigo?: boolean
  /** Temporariamente indisponível (ex.: salvando). */
  desabilitada?: boolean
  /** Indisponível por uma regra: a ação aparece apagada e o motivo fica visível logo abaixo. */
  motivo?: string
}

/**
 * Botão "⋯" que abre a lista de ações da linha num popover nativo
 * (fecha ao clicar fora, com Esc, ao escolher ou ao rolar a página).
 */
export function MenuAcoes({ rotulo, acoes }: { rotulo: string; acoes: Acao[] }) {
  const id = useId()
  const botao = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = painel.current
    if (!el) return
    const fechar = () => el.hidePopover()
    const aoAlternar = (e: Event) => {
      const aberto = (e as ToggleEvent).newState === 'open'
      if (aberto && botao.current) {
        // abaixo do botão, alinhado pela direita; se não couber embaixo, abre para cima
        const r = botao.current.getBoundingClientRect()
        const altura = el.offsetHeight || acoes.length * 36 + acoes.filter((a) => a.motivo).length * 40 + 12
        el.style.right = `${window.innerWidth - r.right}px`
        if (r.bottom + altura + 8 > window.innerHeight) {
          el.style.top = ''
          el.style.bottom = `${window.innerHeight - r.top + 4}px`
        } else {
          el.style.bottom = ''
          el.style.top = `${r.bottom + 4}px`
        }
        window.addEventListener('scroll', fechar, { capture: true, passive: true, once: true })
      } else {
        window.removeEventListener('scroll', fechar, { capture: true })
      }
    }
    el.addEventListener('beforetoggle', aoAlternar)
    return () => {
      el.removeEventListener('beforetoggle', aoAlternar)
      window.removeEventListener('scroll', fechar, { capture: true })
    }
  }, [acoes])

  return (
    <>
      <button
        ref={botao}
        type="button"
        popoverTarget={id}
        aria-label={rotulo}
        title={rotulo}
        className="grid size-8 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
      >
        <DotsThreeIcon aria-hidden="true" size={20} weight="bold" />
      </button>
      <div
        ref={painel}
        id={id}
        popover="auto"
        className="fixed inset-auto m-0 min-w-44 overscroll-contain max-w-64 rounded-[10px] border border-line-strong bg-surface p-1.5 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.14)]"
      >
        <ul className="flex flex-col">
          {acoes.map(({ rotulo: r, icone: Icone, aoClicar, perigo, desabilitada, motivo }) => {
            const idMotivo = `${id}-${r}-motivo`
            return (
              <li key={r}>
                {/* com motivo: aria-disabled em vez de disabled, para continuar focável e o motivo ser lido */}
                <button
                  type="button"
                  disabled={desabilitada}
                  aria-disabled={motivo ? true : undefined}
                  aria-describedby={motivo ? idMotivo : undefined}
                  onClick={() => {
                    if (motivo) return
                    painel.current?.hidePopover()
                    aoClicar()
                  }}
                  className={`flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent ${
                    perigo ? 'text-crit hover:bg-crit-soft' : 'hover:bg-sunken'
                  }`}
                >
                  <Icone aria-hidden="true" size={16} className="shrink-0" />
                  {r}
                </button>
                {motivo ? (
                  <p id={idMotivo} className="flex gap-1.5 px-2.5 pb-1.5 pl-[36px] text-[12px] leading-snug text-muted">
                    <InfoIcon aria-hidden="true" size={13} className="mt-px shrink-0" />
                    {motivo}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
