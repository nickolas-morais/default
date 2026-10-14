import Link from 'next/link'

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none'

const VARIANTES = {
  primario: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secundario: 'border border-line-strong bg-surface text-ink hover:bg-sunken',
  fantasma: 'text-muted hover:bg-sunken hover:text-ink',
  perigo: 'bg-crit text-surface hover:opacity-90',
} as const

const TAMANHOS = {
  md: 'min-h-9 px-3.5 text-[14px]',
  sm: 'min-h-8 px-2.5 text-[13px]',
} as const

type Variante = keyof typeof VARIANTES
type Tamanho = keyof typeof TAMANHOS

export function botaoClass(variante: Variante = 'primario', tamanho: Tamanho = 'md') {
  return `${BASE} ${VARIANTES[variante]} ${TAMANHOS[tamanho]}`
}

export function Button({
  variante,
  tamanho,
  className = '',
  ...props
}: React.ComponentProps<'button'> & { variante?: Variante; tamanho?: Tamanho }) {
  return <button className={`${botaoClass(variante, tamanho)} ${className}`} {...props} />
}

export function ButtonLink({
  variante,
  tamanho,
  className = '',
  ...props
}: React.ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho }) {
  return <Link className={`${botaoClass(variante, tamanho)} ${className}`} {...props} />
}
