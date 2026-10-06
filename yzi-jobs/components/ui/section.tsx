import type { Icon } from '@phosphor-icons/react'

export function Section({
  titulo,
  descricao,
  acao,
  children,
  className = '',
  semPadding = false,
}: {
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
  semPadding?: boolean
}) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-line bg-surface ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-semibold">{titulo}</h2>
          {descricao ? <p className="mt-0.5 text-[13px] text-muted">{descricao}</p> : null}
        </div>
        {acao}
      </header>
      <div className={semPadding ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

export function EmptyState({
  titulo,
  icone: Icone,
  acao,
  children,
}: {
  titulo: string
  icone?: Icon
  acao?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-[10px] border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      {Icone ? (
        <span className="mb-4 grid size-10 place-items-center rounded-md bg-sunken text-muted">
          <Icone aria-hidden="true" size={20} />
        </span>
      ) : null}
      <p className="text-[15px] font-semibold">{titulo}</p>
      {children ? <div className="mt-1 max-w-[52ch] text-[14px] text-muted">{children}</div> : null}
      {acao ? <div className="mt-5">{acao}</div> : null}
    </div>
  )
}
