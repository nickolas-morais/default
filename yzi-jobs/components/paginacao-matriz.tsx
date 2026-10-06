'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransicaoMatriz } from '@/components/matriz-transicao'
import { Paginacao } from '@/components/ui/paginacao'
import { OPCOES_MATRIZ } from '@/lib/status'


/** Paginação da matriz guardada na URL (?pagina=, ?por=), como os outros filtros. */
export function PaginacaoMatriz({ total, pagina, porPagina, totalPaginas }: { total: number; pagina: number; porPagina: number; totalPaginas: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { iniciar } = useTransicaoMatriz()

  function ir(mudancas: Record<string, string | null>) {
    const novo = new URLSearchParams(params)
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) novo.set(k, v)
      else novo.delete(k)
    }
    // volta ao topo da tabela: a página nova começa lá
    iniciar(() => router.push(`${pathname}${novo.size ? `?${novo}` : ''}`))
  }

  return (
    <Paginacao
      total={total}
      pagina={pagina}
      totalPaginas={totalPaginas}
      porPagina={porPagina}
      inicio={(pagina - 1) * porPagina}
      rotulo={total === 1 ? 'job' : 'jobs'}
      opcoes={OPCOES_MATRIZ}
      aoMudarPagina={(p) => ir({ pagina: p > 1 ? String(p) : null })}
      aoMudarPorPagina={(n) => ir({ por: n === OPCOES_MATRIZ[0] ? null : String(n), pagina: null })}
    />
  )
}
