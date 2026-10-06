'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { DesktopIcon, MoonIcon, SunIcon, type Icon } from '@phosphor-icons/react'
import { atributoTema, COOKIE_TEMA, type Tema } from '@/lib/tema'

const OPCOES: { tema: Tema; rotulo: string; Icone: Icon }[] = [
  { tema: 'claro', rotulo: 'Claro', Icone: SunIcon },
  { tema: 'escuro', rotulo: 'Escuro', Icone: MoonIcon },
  { tema: 'sistema', rotulo: 'Sistema', Icone: DesktopIcon },
]

const EVENTO = 'yzi:tema'

/** Tema atual, sincronizado entre todos os seletores da tela (menu, popover, página de perfil). */
function useTemaAtual(inicial: Tema) {
  const [tema, setTema] = useState(inicial)
  useEffect(() => {
    const ouvir = (e: Event) => setTema((e as CustomEvent<Tema>).detail)
    window.addEventListener(EVENTO, ouvir)
    return () => window.removeEventListener(EVENTO, ouvir)
  }, [])
  return tema
}

function escolher(novo: Tema) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: novo }))
  const attr = atributoTema(novo)
  if (attr) document.documentElement.dataset.theme = attr
  else delete document.documentElement.dataset.theme
  // cor da barra do navegador (celular) acompanha a troca sem recarregar
  const escuro = attr === 'dark' || (!attr && window.matchMedia('(prefers-color-scheme: dark)').matches)
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', escuro ? '#0f0f12' : '#f7f7f8')
    meta.removeAttribute('media')
  }
  document.cookie =
    novo === 'sistema' ? `${COOKIE_TEMA}=; path=/; max-age=0` : `${COOKIE_TEMA}=${novo}; path=/; max-age=31536000; samesite=lax`
}

export function SeletorTema({ inicial }: { inicial: Tema }) {
  const tema = useTemaAtual(inicial)

  return (
    <div role="group" aria-label="Tema" className="grid grid-cols-3 gap-0.5 rounded-md bg-sunken p-0.5">
      {OPCOES.map(({ tema: t, rotulo, Icone }) => {
        const ativo = t === tema
        return (
          <button
            key={t}
            type="button"
            aria-pressed={ativo}
            onClick={() => escolher(t)}
            className={`flex min-h-8 items-center justify-center gap-1.5 rounded-[5px] px-2 text-[12.5px] font-medium transition-colors motion-reduce:transition-none ${
              ativo ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]' : 'text-muted hover:text-ink'
            }`}
          >
            <Icone aria-hidden="true" size={14} weight={ativo ? 'fill' : 'regular'} />
            {rotulo}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Versão compacta para o menu recolhido: botão com o ícone do tema atual
 * que abre o seletor num popover nativo (fecha ao clicar fora, com Esc ou ao escolher).
 */
export function BotaoTema({ inicial, className = '' }: { inicial: Tema; className?: string }) {
  const tema = useTemaAtual(inicial)
  const id = useId()
  const botao = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)
  const atual = OPCOES.find((o) => o.tema === tema) ?? OPCOES[2]

  useEffect(() => {
    const el = painel.current
    if (!el) return
    // Abre à direita do botão, alinhado pela base (o botão fica no rodapé do menu).
    const posicionar = (e: Event) => {
      if ((e as ToggleEvent).newState !== 'open' || !botao.current) return
      const r = botao.current.getBoundingClientRect()
      el.style.left = `${r.right + 8}px`
      el.style.bottom = `${window.innerHeight - r.bottom}px`
    }
    el.addEventListener('beforetoggle', posicionar)
    return () => el.removeEventListener('beforetoggle', posicionar)
  }, [])

  // Escolheu um tema: fecha o popover.
  useEffect(() => {
    const fechar = () => painel.current?.hidePopover?.()
    window.addEventListener(EVENTO, fechar)
    return () => window.removeEventListener(EVENTO, fechar)
  }, [])

  return (
    <>
      <button
        ref={botao}
        type="button"
        popoverTarget={id}
        title={`Tema: ${atual.rotulo}`}
        aria-label={`Tema: ${atual.rotulo}. Alterar tema`}
        className={`grid min-h-9 w-full place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink motion-reduce:transition-none ${className}`}
      >
        <atual.Icone aria-hidden="true" size={18} />
      </button>
      <div
        ref={painel}
        id={id}
        popover="auto"
        className="fixed inset-auto m-0 w-max rounded-[10px] border border-line-strong bg-surface p-2 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.14)]"
      >
        <p className="px-1 pb-1.5 text-[12px] font-medium text-muted">Tema</p>
        <SeletorTema inicial={tema} />
      </div>
    </>
  )
}
