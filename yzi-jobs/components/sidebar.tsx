'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  BellIcon,
  CalendarDotsIcon,
  ChartLineUpIcon,
  ListIcon,
  NotePencilIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SquaresFourIcon,
  UserCircleGearIcon,
  UsersThreeIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { sair } from '@/app/(auth)/login/actions'
import { BotaoTema, SeletorTema } from '@/components/seletor-tema'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/esqueleto'
import { COOKIE_MENU } from '@/lib/menu'
import type { Tema } from '@/lib/tema'

export type ChaveIcone = 'matriz' | 'talentos' | 'agenda' | 'alertas' | 'metas' | 'cadastros' | 'usuarios'
export type ItemNav = { href: string; label: string; icone: ChaveIcone }
export type GrupoNav = { titulo: string; itens: ItemNav[] }

const ICONES: Record<ChaveIcone, Icon> = {
  matriz: SquaresFourIcon,
  talentos: UsersThreeIcon,
  agenda: CalendarDotsIcon,
  alertas: BellIcon,
  metas: ChartLineUpIcon,
  cadastros: NotePencilIcon,
  usuarios: UserCircleGearIcon,
}

type Props = {
  grupos: GrupoNav[]
  alertas: number
  usuario: { nome: string; perfil: string; foto: string | null }
  tema: Tema
  recolhidoInicial: boolean
}

/** Inverte o estado do menu no <html> e no cookie; devolve se ficou recolhido. */
function alternarMenu() {
  const raiz = document.documentElement
  const novo = raiz.dataset.menu !== 'recolhido'
  if (novo) raiz.dataset.menu = 'recolhido'
  else delete raiz.dataset.menu
  document.cookie = novo ? `${COOKIE_MENU}=recolhido; path=/; max-age=31536000; samesite=lax` : `${COOKIE_MENU}=; path=/; max-age=0`
  return novo
}

// As classes "recolhido:" (ver globals.css) só valem dentro do menu de desktop,
// marcado com data-menu-lateral; a gaveta do celular não é afetada.
export function Sidebar({ grupos, alertas, usuario, tema, recolhidoInicial }: Props) {
  const gaveta = useRef<HTMLDialogElement>(null)
  const fechar = () => gaveta.current?.close()
  const [recolhido, setRecolhido] = useState(recolhidoInicial)
  const alternar = () => setRecolhido(alternarMenu())

  // Atalho "[" (fora de campos de texto), o mesmo de outras ferramentas de trabalho.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      setRecolhido(alternarMenu())
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <>
      {/* Desktop */}
      <aside
        data-menu-lateral
        className="hidden overflow-hidden border-r border-line bg-surface md:sticky md:top-0 md:flex md:h-dvh md:flex-col"
      >
        <div className="flex h-14 shrink-0 items-center px-5 recolhido:justify-center recolhido:px-0">
          <Marca />
        </div>
        <Navegacao grupos={grupos} alertas={alertas} dicas={recolhido} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" />
        <div className="flex flex-col gap-2 px-3 pb-3">
          <button
            type="button"
            onClick={alternar}
            aria-expanded={!recolhido}
            title={recolhido ? 'Expandir menu ( [ )' : 'Recolher menu ( [ )'}
            className="flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-muted transition-colors hover:bg-sunken hover:text-ink recolhido:justify-center recolhido:px-0 motion-reduce:transition-none"
          >
            <SidebarSimpleIcon aria-hidden="true" size={18} className="shrink-0" />
            <span className="truncate recolhido:sr-only">{recolhido ? 'Expandir menu' : 'Recolher menu'}</span>
          </button>
          <div className="recolhido:hidden">
            <SeletorTema inicial={tema} />
          </div>
          <BotaoTema inicial={tema} className="hidden recolhido:grid" />
        </div>
        <Conta usuario={usuario} dicas={recolhido} />
      </aside>

      {/* Celular */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 pt-[env(safe-area-inset-top)] md:hidden">
        <Marca />
        <button
          type="button"
          onClick={() => gaveta.current?.showModal()}
          className="relative -mr-2 grid size-10 place-items-center rounded-md text-ink hover:bg-sunken"
          aria-label={alertas > 0 ? `Abrir menu (${alertas} alertas abertos)` : 'Abrir menu'}
        >
          <ListIcon aria-hidden="true" size={22} />
          {alertas > 0 ? <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-crit ring-2 ring-surface" /> : null}
        </button>
      </header>
      <dialog
        ref={gaveta}
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === e.currentTarget) fechar()
        }}
        className="m-0 h-dvh max-h-none w-[min(300px,86vw)] overscroll-contain max-w-none bg-surface p-0 text-ink"
      >
        <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center justify-between px-5">
            <Marca />
            <button type="button" onClick={fechar} aria-label="Fechar menu" className="-mr-2 grid size-10 place-items-center rounded-md hover:bg-sunken">
              <XIcon aria-hidden="true" size={20} />
            </button>
          </div>
          <Navegacao grupos={grupos} alertas={alertas} aoNavegar={fechar} className="flex-1 overflow-y-auto px-3 py-2" />
          <div className="px-3 pb-3">
            <SeletorTema inicial={tema} />
          </div>
          <Conta usuario={usuario} aoNavegar={fechar} />
        </div>
      </dialog>
    </>
  )
}

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md" translate="no" aria-label="YZI Jobs, ir para a matriz">
      <span className="grid h-7 place-items-center rounded-md bg-ink px-1.5 text-[12px] font-bold tracking-wide text-surface">YZI</span>
      <span className="text-[15px] font-semibold tracking-[-0.01em] recolhido:hidden">Jobs</span>
    </Link>
  )
}

function Navegacao({
  grupos,
  alertas,
  aoNavegar,
  dicas = false,
  className,
}: {
  grupos: GrupoNav[]
  alertas: number
  aoNavegar?: () => void
  /** Mostra o nome no title (tooltip) quando só o ícone está visível. */
  dicas?: boolean
  className?: string
}) {
  const pathname = usePathname()
  const ativo = (href: string) => (href === '/' ? pathname === '/' || pathname.startsWith('/jobs') : pathname.startsWith(href))

  return (
    <nav aria-label="Seções" className={className}>
      {grupos.map((g) => (
        <div key={g.titulo} className="mb-5 last:mb-0 recolhido:mb-3 recolhido:border-b recolhido:border-line recolhido:pb-3 recolhido:last:border-0">
          <p className="truncate px-2.5 pb-1.5 text-[12px] font-medium text-muted recolhido:sr-only">{g.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {g.itens.map((item) => {
              const Icone = ICONES[item.icone]
              const atual = ativo(item.href)
              const comAlerta = item.icone === 'alertas' && alertas > 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={aoNavegar}
                    aria-current={atual ? 'page' : undefined}
                    title={dicas ? (comAlerta ? `${item.label} (${alertas})` : item.label) : undefined}
                    className="relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[14px] text-muted transition-colors hover:bg-sunken hover:text-ink aria-[current=page]:bg-sunken aria-[current=page]:font-medium aria-[current=page]:text-ink recolhido:justify-center recolhido:px-0 motion-reduce:transition-none"
                  >
                    <Icone aria-hidden="true" size={18} weight={atual ? 'fill' : 'regular'} className={`shrink-0 ${atual ? 'text-accent' : ''}`} />
                    <span className="flex-1 truncate recolhido:sr-only">{item.label}</span>
                    {comAlerta ? (
                      <>
                        <span className="tabular min-w-5 rounded-md bg-crit-soft px-1.5 text-center text-[12px] font-semibold leading-5 text-crit recolhido:sr-only">
                          <span className="sr-only">, </span>
                          {alertas}
                          <span className="sr-only"> abertos</span>
                        </span>
                        <span aria-hidden="true" className="absolute right-2.5 top-1.5 hidden size-2 rounded-full bg-crit ring-2 ring-surface recolhido:block" />
                      </>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function Conta({ usuario, aoNavegar, dicas = false }: { usuario: Props['usuario']; aoNavegar?: () => void; dicas?: boolean }) {
  const atual = usePathname() === '/perfil'
  return (
    <div className="flex items-center gap-1 border-t border-line px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))] recolhido:flex-col">
      <Link
        href="/perfil"
        onClick={aoNavegar}
        aria-current={atual ? 'page' : undefined}
        title={dicas ? `Meu perfil: ${usuario.nome}` : 'Meu perfil'}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 hover:bg-sunken aria-[current=page]:bg-sunken recolhido:flex-none recolhido:px-1.5"
      >
        <Avatar nome={usuario.nome} foto={usuario.foto} />
        <span className="min-w-0 flex-1 recolhido:sr-only">
          <span className="block truncate text-[13.5px] font-medium">{usuario.nome}</span>
          <span className="block truncate text-[12.5px] text-muted">{usuario.perfil}</span>
        </span>
      </Link>
      <form action={sair}>
        <BotaoSair />
      </form>
    </div>
  )
}

/** Fica travado e girando enquanto a saída acontece (useFormStatus lê o <form> em volta). */
function BotaoSair() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={pending ? 'Saindo…' : 'Sair'}
      title="Sair"
      className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink disabled:cursor-wait"
    >
      {pending ? <Spinner tamanho={16} /> : <SignOutIcon aria-hidden="true" size={18} />}
    </button>
  )
}
