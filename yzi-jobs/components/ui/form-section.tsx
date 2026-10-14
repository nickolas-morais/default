import { useId } from 'react'

// Bloco de formulário em duas colunas: explicação à esquerda, campos à direita.
// role="group" + aria-labelledby faz o leitor de tela anunciar o grupo, como um fieldset.
export function FormSection({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  const id = useId()
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="grid min-w-0 grid-cols-1 gap-x-10 gap-y-4 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)]"
    >
      <div>
        <h2 id={id} className="text-[15px] font-semibold">
          {titulo}
        </h2>
        {descricao ? <p className="pt-1 text-[13.5px] text-muted">{descricao}</p> : null}
      </div>
      <div className="min-w-0 rounded-[10px] border border-line bg-surface p-5">{children}</div>
    </div>
  )
}
