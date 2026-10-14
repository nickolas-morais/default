'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, inputClass } from '@/components/ui/field'
import { InputSenha } from '@/components/ui/input-senha'
import { definirSenha, entrar, pedirNovaSenha } from '@/app/(auth)/login/actions'

function Mensagem({ erro, ok }: { erro?: string; ok?: string }) {
  return (
    <p
      aria-live="polite"
      className={`rounded-md px-3 py-2 text-[13.5px] font-medium empty:hidden ${erro ? 'bg-crit-soft text-crit' : 'bg-done-soft text-done'}`}
    >
      {erro ?? ok ?? ''}
    </p>
  )
}

const linkClass = 'rounded-sm text-[13.5px] font-medium text-accent hover:underline'

export function LoginForm({ volta }: { volta?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, undefined)
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="volta" value={volta ?? ''} />
      <Field label="E-mail" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required className={inputClass} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="senha" className="text-[13px] font-medium">
            Senha
          </label>
          <Link href="/esqueci-senha" className={linkClass}>
            Esqueci minha senha
          </Link>
        </div>
        <InputSenha id="senha" name="senha" autoComplete="current-password" required />
      </div>
      <Mensagem erro={estado?.erro} />
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function EsqueciForm() {
  const [estado, acao, pendente] = useActionState(pedirNovaSenha, undefined)
  return (
    <form action={acao} className="flex flex-col gap-4">
      <Field label="E-mail" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required className={inputClass} />
      </Field>
      <Mensagem erro={estado?.erro} ok={estado?.ok} />
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? 'Enviando…' : 'Enviar link'}
      </Button>
      <Link href="/login" className={`${linkClass} self-center`}>
        Voltar para o login
      </Link>
    </form>
  )
}

export function DefinirSenhaForm() {
  const [estado, acao, pendente] = useActionState(definirSenha, undefined)
  return (
    <form action={acao} className="flex flex-col gap-4">
      <Field label="Nova senha" htmlFor="senha" ajuda="Pelo menos 10 caracteres.">
        <InputSenha id="senha" name="senha" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Confirme a senha" htmlFor="confirmacao">
        <InputSenha id="confirmacao" name="confirmacao" autoComplete="new-password" required />
      </Field>
      <Mensagem erro={estado?.erro} />
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? 'Salvando…' : 'Salvar senha'}
      </Button>
    </form>
  )
}
