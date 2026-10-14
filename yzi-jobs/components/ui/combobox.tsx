'use client'

import { useEffect, useState } from 'react'
import { CaretDownIcon, CheckIcon, PlusIcon } from '@phosphor-icons/react'
import { Avatar } from '@/components/ui/avatar'
import { inputClass } from '@/components/ui/field'

export type OpcaoCombobox = {
  id: string
  rotulo: string
  marcada?: boolean
  criar?: boolean
  /** Mostra o avatar ao lado do rótulo: URL da foto, ou null para as iniciais. Ausente = sem avatar. */
  foto?: string | null
}

/**
 * Campo de busca com lista de opções (padrão ARIA "combobox" com listbox).
 * Quem usa controla o texto e filtra as opções; este componente cuida de abrir/fechar,
 * do item ativo e do teclado: setas, Enter escolhe, Esc fecha.
 */
export function Combobox({
  id,
  texto,
  opcoes,
  aoDigitar,
  aoEscolher,
  placeholder,
  vazio = 'Nada encontrado.',
  multipla = false,
  invalido = false,
  describedBy,
  aoSair,
}: {
  id: string
  texto: string
  opcoes: OpcaoCombobox[]
  aoDigitar: (texto: string) => void
  aoEscolher: (id: string) => void
  placeholder?: string
  vazio?: string
  /** Lista de marcação múltipla: continua aberta depois de escolher. */
  multipla?: boolean
  invalido?: boolean
  describedBy?: string
  /** O campo perdeu o foco (ex.: desfazer texto digitado que não virou escolha). */
  aoSair?: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const lista = `${id}-lista`
  const idOpcao = (o: OpcaoCombobox) => `${id}-op-${o.id}`
  const atual = opcoes[Math.min(ativo, opcoes.length - 1)]

  // mantém o item ativo visível ao navegar pelo teclado
  useEffect(() => {
    if (aberto && atual) document.getElementById(`${id}-op-${atual.id}`)?.scrollIntoView({ block: 'nearest' })
  }, [aberto, atual, id])

  function escolher(o: OpcaoCombobox) {
    aoEscolher(o.id)
    if (!multipla) setAberto(false)
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!aberto) return setAberto(true)
      const passo = e.key === 'ArrowDown' ? 1 : -1
      setAtivo((i) => Math.min(Math.max(Math.min(i, opcoes.length - 1) + passo, 0), Math.max(opcoes.length - 1, 0)))
    } else if (e.key === 'Enter') {
      // Enter dentro do campo nunca envia o formulário inteiro por engano
      e.preventDefault()
      if (aberto && atual) escolher(atual)
      else setAberto(true)
    } else if (e.key === 'Escape' && aberto) {
      e.preventDefault()
      setAberto(false)
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={lista}
        aria-autocomplete="list"
        aria-activedescendant={aberto && atual ? idOpcao(atual) : undefined}
        aria-invalid={invalido || undefined}
        aria-describedby={describedBy}
        // O Chrome ignora autocomplete="off" e mostra o histórico por cima da lista.
        // Sem formulário (form aponta para um id inexistente), o texto digitado nunca é enviado
        // nem salvo no histórico; o valor real vai no campo oculto de quem usa o Combobox.
        autoComplete="off"
        form="sem-formulario"
        data-1p-ignore
        data-lpignore="true"
        spellCheck={false}
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          aoDigitar(e.target.value)
          setAberto(true)
          setAtivo(0)
        }}
        onFocus={() => setAberto(true)}
        onClick={() => setAberto(true)}
        onBlur={() => {
          setAberto(false)
          aoSair?.()
        }}
        onKeyDown={aoTeclar}
        className={`${inputClass} pr-8 ${invalido ? 'border-crit' : ''}`}
      />
      <CaretDownIcon aria-hidden="true" size={14} weight="bold" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />

      {aberto ? (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_8px_24px_rgb(0_0_0/0.12)]">
          {opcoes.length ? (
            <ul id={lista} role="listbox" aria-multiselectable={multipla || undefined} className="max-h-64 overflow-y-auto overscroll-contain p-1">
              {opcoes.map((o, i) => {
                const ehAtivo = o === atual
                return (
                  <li
                    key={o.id}
                    id={idOpcao(o)}
                    role="option"
                    aria-selected={multipla ? Boolean(o.marcada) : ehAtivo}
                    // mousedown em vez de click: escolhe antes de o campo perder o foco e fechar a lista
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setAtivo(i)
                      escolher(o)
                    }}
                    onMouseMove={() => setAtivo(i)}
                    className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[14px] ${ehAtivo ? 'bg-sunken' : ''} ${
                      o.criar ? 'font-medium text-accent' : ''
                    }`}
                  >
                    {o.criar ? (
                      <PlusIcon aria-hidden="true" size={15} weight="bold" className="shrink-0" />
                    ) : multipla ? (
                      <span
                        aria-hidden="true"
                        className={`grid size-4 shrink-0 place-items-center rounded border ${o.marcada ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong'}`}
                      >
                        {o.marcada ? <CheckIcon size={11} weight="bold" /> : null}
                      </span>
                    ) : null}
                    {o.foto !== undefined ? <Avatar nome={o.rotulo} foto={o.foto} tamanho="sm" /> : null}
                    <span className="min-w-0 truncate">{o.rotulo}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p id={lista} className="px-3.5 py-3 text-[13.5px] text-muted">
              {vazio}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Comparação sem acentos e sem maiúsculas, para busca e para achar nomes repetidos. */
export function normalizar(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
