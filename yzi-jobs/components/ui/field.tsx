import { CaretDownIcon } from '@phosphor-icons/react/ssr'

// Rótulo acima, ajuda opcional, erro abaixo. Nunca placeholder como rótulo.
export function Field({
  label,
  htmlFor,
  ajuda,
  erro,
  children,
  className = '',
}: {
  label: string
  htmlFor: string
  ajuda?: string
  erro?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    // data-erro: useFocoNoPrimeiroErro leva o foco ao primeiro campo marcado
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`} data-erro={erro ? '' : undefined}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {ajuda ? <p className="text-[12.5px] text-muted">{ajuda}</p> : null}
      {erro ? (
        <p className="text-[12.5px] font-medium text-crit" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  )
}

// 16px no celular evita o zoom automático do iOS ao focar o campo.
export const inputClass =
  'min-h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-base text-ink transition-colors placeholder:text-muted hover:border-muted/60 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted sm:text-[14px] motion-reduce:transition-none'

/** Select nativo com seta própria (a seta do sistema varia muito entre navegadores). */
export function Select({ className = '', compacto = false, ...props }: React.ComponentProps<'select'> & { compacto?: boolean }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select
        {...props}
        className={`${inputClass} cursor-pointer appearance-none pr-8 ${compacto ? 'min-h-8 text-[13px] sm:text-[13px]' : ''}`}
      />
      <CaretDownIcon
        aria-hidden="true"
        size={14}
        weight="bold"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  )
}

export function Checkbox({ children, className = '', ...props }: React.ComponentProps<'input'>) {
  return (
    <label className={`inline-flex min-h-9 cursor-pointer items-center gap-2.5 text-[14px] ${className}`}>
      <input type="checkbox" {...props} className="size-4 shrink-0 cursor-pointer rounded accent-[var(--accent)]" />
      {children}
    </label>
  )
}
