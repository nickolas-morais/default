import { CircleNotchIcon } from '@phosphor-icons/react/ssr'

/*
 * Blocos de espera no formato da tela que vai aparecer (loading.tsx de cada rota),
 * para não "pular" de um desenho para outro. Só servidor; nada interativo.
 */

const pulso = 'animate-pulse rounded-md bg-sunken motion-reduce:animate-none'

export function Bloco({ className = '' }: { className?: string }) {
  return <div className={`${pulso} ${className}`} />
}

/** Indicador de "carregando" para botões e campos. */
export function Spinner({ tamanho = 16, className = '' }: { tamanho?: number; className?: string }) {
  return <CircleNotchIcon aria-hidden="true" size={tamanho} weight="bold" className={`animate-spin ${className}`} />
}

/** Envolve a tela de espera: anuncia "Carregando" para leitor de tela e esconde os blocos dele. */
export function Carregando({ rotulo = 'Carregando…', children }: { rotulo?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{rotulo}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

export function CabecalhoEsqueleto({ comAcao = false }: { comAcao?: boolean }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <Bloco className="mb-2 h-7 w-56" />
        <Bloco className="h-4 w-80 max-w-full" />
      </div>
      {comAcao ? <Bloco className="h-9 w-28" /> : null}
    </div>
  )
}

/** Barra de filtros: abas (largura conforme a quantidade), busca e, opcionalmente, um select. */
export function FiltrosEsqueleto({ abas = 3, comSelect = true }: { abas?: number; comSelect?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Bloco className={`h-9 max-w-full ${abas >= 5 ? 'w-[420px]' : abas >= 3 ? 'w-64' : 'w-44'}`} />
      <Bloco className="h-9 w-72 max-w-full" />
      {comSelect ? <Bloco className="hidden h-9 w-56 sm:block" /> : null}
    </div>
  )
}

/** Lista em cartão com linhas (agenda, alertas, equipe, tabelas de cadastro). */
export function ListaEsqueleto({ linhas = 5, comAvatar = false }: { linhas?: number; comAvatar?: boolean }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          {comAvatar ? <Bloco className="size-9 shrink-0 rounded-full" /> : null}
          <div className="flex flex-1 flex-col gap-2">
            <Bloco className="h-3.5 w-1/3 min-w-32" />
            <Bloco className="h-3 w-1/4 min-w-24" />
          </div>
          <Bloco className="h-5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Formulário em seções (explicação à esquerda, campos à direita), como Novo job e Meu perfil. */
export function FormularioEsqueleto({ secoes = 3 }: { secoes?: number }) {
  return (
    <div>
      {Array.from({ length: secoes }, (_, i) => (
        <div key={i} className="grid grid-cols-1 gap-x-10 gap-y-4 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <Bloco className="h-4 w-28" />
            <Bloco className="h-3 w-48" />
          </div>
          <div className="grid grid-cols-1 gap-4 rounded-[10px] border border-line bg-surface p-5 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j} className="flex flex-col gap-2">
                <Bloco className="h-3 w-24" />
                <Bloco className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
