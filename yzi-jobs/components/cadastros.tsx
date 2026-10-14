'use client'

import { useActionState } from 'react'
import { salvarMeta } from '@/app/(app)/cadastros/actions'
import { useToastDeSucesso } from '@/components/toaster'
import { Button } from '@/components/ui/button'
import { Field, inputClass } from '@/components/ui/field'
import { InputMoeda } from '@/components/ui/input-moeda'
import { SelectBusca } from '@/components/ui/select-busca'

type Opcao = { id: string; nome: string }

export function MetaForm({ analistas, ano }: { analistas: Opcao[]; ano: number }) {
  const [estado, acao, pendente] = useActionState(salvarMeta, undefined)
  useToastDeSucesso(estado)
  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)]">
        <Field label="Analista" htmlFor="analista_id">
          <SelectBusca id="analista_id" name="analista_id" opcoes={analistas} placeholder="Buscar analista…" />
        </Field>
        <Field label="Ano" htmlFor="ano">
          <input id="ano" name="ano" type="number" inputMode="numeric" defaultValue={ano} className={`${inputClass} tabular`} />
        </Field>
        <Field label="Meta" htmlFor="valor">
          <InputMoeda id="valor" name="valor" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        {/* sucesso vai para o toast; aqui fica só o erro, perto do formulário */}
        <p aria-live="polite" className="mr-auto text-[13.5px] font-medium text-crit empty:hidden">
          {estado?.erro ?? ''}
        </p>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar meta'}
        </Button>
      </div>
    </form>
  )
}
