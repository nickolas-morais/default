export function AuthCard({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col px-4 py-10">
      <div className="m-auto w-full max-w-[380px]">
        <p className="mb-8 flex items-center justify-center gap-2.5" translate="no">
          <span className="grid h-8 place-items-center rounded-md bg-ink px-2 text-[13px] font-bold tracking-wide text-surface">YZI</span>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Jobs</span>
        </p>
        <div className="rounded-[10px] border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{titulo}</h1>
          {descricao ? <p className="mt-1 text-[14px] text-muted">{descricao}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-[12.5px] text-muted">Acesso somente por convite da diretoria.</p>
      </div>
    </main>
  )
}
