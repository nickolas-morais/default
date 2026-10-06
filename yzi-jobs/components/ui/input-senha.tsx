'use client'

import { useRef, useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { inputClass } from '@/components/ui/field'

/** Campo de senha com botão para mostrar/ocultar o que foi digitado. */
export function InputSenha({ className = '', ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visivel, setVisivel] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  function alternar() {
    const el = campo.current
    // mantém o cursor onde estava (trocar o type joga o cursor para o início em alguns navegadores)
    const inicio = el?.selectionStart ?? null
    const fim = el?.selectionEnd ?? null
    setVisivel((v) => !v)
    requestAnimationFrame(() => {
      if (!el || inicio === null || fim === null) return
      el.focus()
      el.setSelectionRange(inicio, fim)
    })
  }

  return (
    <div className="relative">
      <input ref={campo} type={visivel ? 'text' : 'password'} {...props} className={`${inputClass} pr-10 ${className}`} />
      <button
        type="button"
        onClick={alternar}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        aria-controls={props.id}
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
      >
        {visivel ? <EyeSlashIcon aria-hidden="true" size={18} /> : <EyeIcon aria-hidden="true" size={18} />}
      </button>
    </div>
  )
}
