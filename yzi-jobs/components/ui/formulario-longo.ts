'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Depois de um envio com erro, leva o foco (e a rolagem) ao primeiro campo com erro.
 * O <Field> marca o campo com data-erro quando recebe uma mensagem de erro.
 */
export function useFocoNoPrimeiroErro(form: RefObject<HTMLFormElement | null>, estado: unknown) {
  useEffect(() => {
    if (!estado) return
    const campo = form.current?.querySelector<HTMLElement>(
      '[data-erro] input:not([type="hidden"]):not([tabindex="-1"]), [data-erro] select, [data-erro] textarea',
    )
    campo?.focus()
  }, [estado, form])
}

/**
 * Pergunta antes de fechar ou recarregar a aba com alterações não salvas.
 * (Cobre fechar/recarregar; a navegação dentro do app não passa por aqui.)
 */
export function useAvisoAoSair(form: RefObject<HTMLFormElement | null>, salvo: boolean) {
  const alterado = useRef(false)
  useEffect(() => {
    const el = form.current
    if (!el) return
    const marcar = () => (alterado.current = true)
    const avisar = (e: BeforeUnloadEvent) => {
      if (!alterado.current || salvo) return
      e.preventDefault()
      e.returnValue = ''
    }
    el.addEventListener('input', marcar)
    window.addEventListener('beforeunload', avisar)
    return () => {
      el.removeEventListener('input', marcar)
      window.removeEventListener('beforeunload', avisar)
    }
  }, [form, salvo])
}
