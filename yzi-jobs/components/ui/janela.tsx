'use client'

import { useId, useRef, useState } from 'react'

/**
 * Controle de uma janela modal (<dialog> nativo: foco preso, Esc fecha).
 * `chave` muda a cada abertura; use como key do conteúdo para descartar o que não foi salvo.
 */
export function useJanela() {
  const ref = useRef<HTMLDialogElement>(null)
  const [chave, setChave] = useState(0)
  return {
    ref,
    chave,
    abrir: () => {
      setChave((c) => c + 1)
      ref.current?.showModal()
    },
    fechar: () => ref.current?.close(),
  }
}

export function Janela({
  janela,
  titulo,
  descricao,
  children,
}: {
  janela: ReturnType<typeof useJanela>
  titulo: string
  descricao?: React.ReactNode
  children: React.ReactNode
}) {
  const id = useId()
  return (
    <dialog
      ref={janela.ref}
      aria-labelledby={id}
      onClick={(e) => {
        if (e.target === e.currentTarget) janela.fechar()
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(440px,calc(100vw-32px))] overscroll-contain rounded-[10px] border border-line bg-surface p-0 text-ink shadow-[0_16px_48px_rgb(0_0_0/0.18)]"
    >
      <div className="p-6">
        <h2 id={id} className="text-[16px] font-semibold">
          {titulo}
        </h2>
        {descricao ? <div className="mt-1 text-[13.5px] text-muted">{descricao}</div> : null}
        <div key={janela.chave} className="mt-5">
          {children}
        </div>
      </div>
    </dialog>
  )
}
