'use client'

import { useActionState, useEffect, useRef } from 'react'
import { trocarSenha } from '@/app/(app)/perfil/actions'
import { useToastDeSucesso } from '@/components/toaster'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { InputSenha } from '@/components/ui/input-senha'

export function TrocarSenhaForm({ email }: { email: string }) {
  const [estado, acao, pendente] = useActionState(trocarSenha, undefined)
  const form = useRef<HTMLFormElement>(null)
  useToastDeSucesso(estado)
  useEffect(() => {
    if (estado?.ok) form.current?.reset()
  }, [estado])

  return (
    <form ref={form} action={acao} className="flex flex-col gap-4">
      {/* ajuda o gerenciador de senhas a associar a nova senha à conta certa */}
      <input type="email" name="usuario" autoComplete="username" value={email} readOnly hidden />
      <Field label="Senha atual" htmlFor="atual" className="md:max-w-[calc(50%-8px)]">
        <InputSenha id="atual" name="atual" autoComplete="current-password" required />
      </Field>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nova senha" htmlFor="senha" ajuda="Pelo menos 10 caracteres.">
          <InputSenha id="senha" name="senha" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirme a nova senha" htmlFor="confirmacao">
          <InputSenha id="confirmacao" name="confirmacao" autoComplete="new-password" required />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p aria-live="polite" className="mr-auto text-[13.5px] font-medium text-crit">
          {estado?.erro ?? ''}
        </p>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Trocar senha'}
        </Button>
      </div>
    </form>
  )
}
