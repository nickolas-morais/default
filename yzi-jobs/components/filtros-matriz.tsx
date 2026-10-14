'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useTransicaoMatriz } from '@/components/matriz-transicao'
import { Spinner } from '@/components/ui/esqueleto'
import { inputClass } from '@/components/ui/field'
import { SelectBusca } from '@/components/ui/select-busca'
import { lerVisaoMatriz, VISOES_MATRIZ, type VisaoMatriz } from '@/lib/status'

// Filtros ficam na URL: dá para compartilhar o link de uma visão filtrada.
export function FiltrosMatriz({
  talentos,
  contagem,
}: {
  talentos: { id: string; nome: string }[]
  contagem: Record<VisaoMatriz, number>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  // compartilhado com a tabela, que esmaece enquanto os dados novos chegam
  const { pendente, iniciar: startTransition } = useTransicaoMatriz()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const visao = lerVisaoMatriz(params.get('ver') ?? undefined)

  function aplicar(chave: string, valor: string) {
    const novo = new URLSearchParams(params)
    if (valor) novo.set(chave, valor)
    else novo.delete(chave)
    // filtro novo começa da primeira página
    novo.delete('pagina')
    startTransition(() => router.replace(`${pathname}${novo.size ? `?${novo}` : ''}`, { scroll: false }))
  }

  const aba = (ativa: boolean) =>
    `inline-flex min-h-8 items-center gap-1.5 rounded-[5px] px-3 text-[13px] font-medium transition-colors motion-reduce:transition-none ${
      ativa ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]' : 'text-muted hover:text-ink'
    }`

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3" aria-busy={pendente}>
      {/* rola de lado no celular em vez de quebrar em várias linhas */}
      <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0">
        <div role="group" aria-label="Mostrar" className="inline-flex rounded-md bg-sunken p-0.5">
          {VISOES_MATRIZ.map((v) => (
            <button
              key={v.valor}
              type="button"
              aria-pressed={visao === v.valor}
              // "ativos" é o padrão: fica sem parâmetro na URL
              onClick={() => aplicar('ver', v.valor === 'ativos' ? '' : v.valor)}
              className={`${aba(visao === v.valor)} whitespace-nowrap`}
            >
              {v.rotulo}
              <span className={`tabular ${v.valor === 'alerta' && contagem.alerta > 0 ? 'text-crit' : 'text-muted'}`}>{contagem[v.valor]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-w-0 flex-[1_1_260px] sm:max-w-xs">
        <label htmlFor="q" className="sr-only">
          Buscar
        </label>
        <MagnifyingGlassIcon aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="q"
          type="search"
          name="q"
          autoComplete="off"
          defaultValue={params.get('q') ?? ''}
          placeholder="Buscar talento, marca ou código…"
          className={`${inputClass} pl-9`}
          onChange={(e) => {
            const v = e.target.value
            clearTimeout(timer.current)
            timer.current = setTimeout(() => aplicar('q', v.trim()), 250)
          }}
        />
      </div>

      <label htmlFor="talento" className="sr-only">
        Filtrar por talento
      </label>
      <div className="w-full sm:w-56">
        <SelectBusca id="talento" opcoes={talentos} valor={params.get('talento') ?? ''} aoMudar={(v) => aplicar('talento', v)} vazio="Todos os talentos" />
      </div>

      {pendente ? (
        <span role="status" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
          <Spinner tamanho={14} />
          Carregando…
        </span>
      ) : null}
    </div>
  )
}
