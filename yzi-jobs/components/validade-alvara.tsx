'use client'

import { useState, useTransition } from 'react'
import { salvarValidadeAlvara } from '@/app/(app)/jobs/[id]/actions'
import { toast } from '@/components/toaster'
import { Spinner } from '@/components/ui/esqueleto'
import { inputClass } from '@/components/ui/field'
import { data } from '@/lib/format'

/** Data de validade do alvará, editável pelo Jurídico. Salva ao sair do campo (ou Enter). */
export function ValidadeAlvara({ jobId, valor }: { jobId: string; valor: string | null }) {
  const [texto, setTexto] = useState(valor ?? '')
  const [salvo, setSalvo] = useState(valor ?? '')
  const [pendente, startTransition] = useTransition()

  function salvar() {
    if (texto === salvo) return
    const anterior = salvo
    setSalvo(texto)
    startTransition(async () => {
      const r = await salvarValidadeAlvara({ jobId, validade: texto || null })
      if (r.ok) {
        toast.success(texto ? `Alvará válido até ${data(texto)}` : 'Validade do alvará removida')
      } else {
        setSalvo(anterior)
        setTexto(anterior)
        toast.error('Não foi possível salvar a validade', { description: r.erro })
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`validade-${jobId}`} className="text-[12.5px] text-muted">
        Válido até
      </label>
      <div className="relative">
        <input
          id={`validade-${jobId}`}
          type="date"
          value={texto}
          disabled={pendente}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              salvar()
            }
          }}
          className={`${inputClass} tabular min-h-8 w-[150px] text-[13px] sm:text-[13px]`}
        />
        {pendente ? (
          <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-accent">
            <Spinner tamanho={13} />
            <span className="sr-only">Salvando…</span>
          </span>
        ) : null}
      </div>
    </div>
  )
}
