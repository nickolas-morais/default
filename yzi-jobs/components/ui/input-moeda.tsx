'use client'

import { useState } from 'react'
import { inputClass } from '@/components/ui/field'

/*
 * Máscara de dinheiro no padrão dos apps de banco: os dígitos entram da direita e os
 * dois últimos são sempre os centavos ("1050" → "10,50"; "8000000" → "80.000,00").
 * Vírgula, ponto e letras digitados são ignorados, então não importa se o teclado
 * numérico manda ponto ou vírgula. O estado é guardado em centavos (inteiro).
 */

const REAIS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// 999 bilhões: evita perder precisão de número muito grande
const MAX_CENTAVOS = 99_999_999_999_999

export function formatarCentavos(centavos: number | null) {
  return centavos === null ? '' : REAIS.format(centavos / 100)
}

/** Texto colado com o valor completo: "80.000,00", "80000.50", "R$ 1.234,56" ou "80000" (reais). */
function centavosDoColado(texto: string): number | null {
  const s = texto.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '')
  if (!/\d/.test(s)) return null
  let reais: number
  if (s.includes(',')) reais = Number(s.replace(/\./g, '').replace(',', '.'))
  else if (/^\d+\.\d{1,2}$/.test(s)) reais = Number(s)
  else reais = Number(s.replace(/\./g, ''))
  return Number.isFinite(reais) ? Math.min(Math.round(reais * 100), MAX_CENTAVOS) : null
}

/** Valor inicial vindo do banco ("85000" ou "85000.5") ou já formatado. */
function centavosIniciais(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  return typeof v === 'number' ? Math.round(v * 100) : centavosDoColado(String(v))
}

export function InputMoeda({
  id,
  name,
  valorInicial,
  aoMudar,
  invalido,
  describedBy,
}: {
  id: string
  name: string
  valorInicial?: string | number | null
  /** Recebe o valor em reais (ou null) a cada mudança, para cálculos ao vivo. */
  aoMudar?: (reais: number | null) => void
  invalido?: boolean
  describedBy?: string
}) {
  const [centavos, setCentavos] = useState(() => centavosIniciais(valorInicial))

  function definir(novo: number | null) {
    setCentavos(novo)
    aoMudar?.(novo === null ? null : novo / 100)
  }

  // cursor sempre no fim: é onde os dígitos entram
  const cursorNoFim = (el: HTMLInputElement) => requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length))

  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">
        R$
      </span>
      <input
        id={id}
        name={name}
        value={formatarCentavos(centavos)}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 14)
          definir(digitos ? Math.min(Number(digitos), MAX_CENTAVOS) : null)
          cursorNoFim(e.target)
        }}
        onPaste={(e) => {
          const colado = centavosDoColado(e.clipboardData.getData('text'))
          if (colado === null) return
          e.preventDefault()
          definir(colado)
          cursorNoFim(e.currentTarget)
        }}
        onFocus={(e) => cursorNoFim(e.currentTarget)}
        onClick={(e) => cursorNoFim(e.currentTarget)}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        aria-invalid={invalido || undefined}
        aria-describedby={describedBy}
        className={`${inputClass} tabular pl-9 ${invalido ? 'border-crit' : ''}`}
      />
    </div>
  )
}
