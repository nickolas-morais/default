'use client'

import { createContext, use, useTransition, type TransitionStartFunction } from 'react'

// Os filtros da matriz e a tabela são irmãos na página: este contexto deixa a tabela
// saber que os filtros estão buscando dados novos no servidor.
const Contexto = createContext<{ pendente: boolean; iniciar: TransitionStartFunction } | null>(null)

export function TransicaoMatriz({ children }: { children: React.ReactNode }) {
  const [pendente, iniciar] = useTransition()
  return <Contexto value={{ pendente, iniciar }}>{children}</Contexto>
}

export function useTransicaoMatriz() {
  const ctx = use(Contexto)
  if (!ctx) throw new Error('useTransicaoMatriz precisa estar dentro de <TransicaoMatriz>')
  return ctx
}

/** Resultado da matriz: esmaece enquanto os filtros carregam, para não parecer que o clique falhou. */
export function ResultadoMatriz({ children }: { children: React.ReactNode }) {
  const { pendente } = useTransicaoMatriz()
  return (
    <div aria-busy={pendente} className={`transition-opacity duration-150 motion-reduce:transition-none ${pendente ? 'pointer-events-none opacity-50' : ''}`}>
      {children}
    </div>
  )
}
