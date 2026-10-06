export function PageHeader({ titulo, descricao, acao }: { titulo: string; descricao?: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] md:text-[24px]">{titulo}</h1>
        {descricao ? <p className="mt-1 max-w-[70ch] text-[14px] text-muted">{descricao}</p> : null}
      </div>
      {acao ? <div className="flex shrink-0 items-center gap-2">{acao}</div> : null}
    </header>
  )
}
