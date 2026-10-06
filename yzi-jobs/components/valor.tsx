import { LockSimpleIcon } from '@phosphor-icons/react/ssr'
import { brl } from '@/lib/format'

export function Restrito({ texto = 'Restrito' }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted">
      <LockSimpleIcon aria-hidden="true" size={13} />
      {texto}
    </span>
  )
}

export function Valor({ valor }: { valor: number | null | undefined }) {
  if (valor === null || valor === undefined) return <Restrito />
  return <span className="tabular whitespace-nowrap font-medium">{brl(valor)}</span>
}
