'use client'

import { useState, useTransition } from 'react'
import { atualizarStatus } from '@/app/(app)/jobs/[id]/actions'
import { toast } from '@/components/toaster'
import { Spinner } from '@/components/ui/esqueleto'
import { Select } from '@/components/ui/field'
import { ETAPAS, type Trilha } from '@/lib/status'
import type { Alvo } from '@/lib/perfis'

type Props = {
  jobId: string
  alvo: Alvo
  trilha: Trilha
  valor: number
  rotulo: string
  podeAlterar: boolean
  talentoId?: string
  entregavelId?: string
}

export function StatusSelect({ jobId, alvo, trilha, valor, rotulo, podeAlterar, talentoId, entregavelId }: Props) {
  const [atual, setAtual] = useState(valor)
  const [pendente, startTransition] = useTransition()

  function mudar(novo: number) {
    const anterior = atual
    setAtual(novo)
    startTransition(async () => {
      const r = await atualizarStatus({ jobId, alvo, valor: novo, talentoId, entregavelId })
      if (r.ok) {
        toast.success(`${rotulo}: ${ETAPAS[trilha][novo]}`)
      } else {
        setAtual(anterior)
        toast.error(`Não foi possível mudar ${rotulo}`, { description: r.erro })
      }
    })
  }

  return (
    <div className="relative w-[196px] max-w-full" aria-busy={pendente}>
      <Select
        compacto
        aria-label={`Status: ${rotulo}`}
        value={atual}
        disabled={!podeAlterar || pendente}
        title={podeAlterar ? undefined : 'Somente a área responsável altera esta etapa'}
        onChange={(e) => mudar(Number(e.target.value))}
      >
        {ETAPAS[trilha].map((etapa, i) => (
          <option key={etapa} value={i}>
            {etapa}
          </option>
        ))}
      </Select>
      {/* salvando: o ícone girando fica por cima da seta do select */}
      {pendente ? (
        <span className="pointer-events-none absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded bg-sunken text-accent">
          <Spinner tamanho={13} />
          <span className="sr-only">Salvando…</span>
        </span>
      ) : null}
    </div>
  )
}
