import { Bloco, Carregando } from '@/components/ui/esqueleto'

function Secao({ linhas, alta = false }: { linhas: number; alta?: boolean }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface">
      <div className="border-b border-line px-5 py-3.5">
        <Bloco className="h-4 w-32" />
      </div>
      <div className="flex flex-col gap-3 p-5">
        {Array.from({ length: linhas }, (_, i) => (
          <Bloco key={i} className={`${alta ? 'h-9' : 'h-4'} w-full`} />
        ))}
      </div>
    </div>
  )
}

// Ficha do job: cabeçalho + coluna principal (trilhas, entregas) + lateral (valores, ficha, arquivos).
export default function CarregandoJob() {
  return (
    <Carregando rotulo="Carregando o job…">
      <Bloco className="mb-4 h-3.5 w-40" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bloco className="h-8 w-80 max-w-full" />
          <Bloco className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Bloco className="h-9 w-28" />
          <Bloco className="h-9 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Secao linhas={5} alta />
          <Secao linhas={3} alta />
        </div>
        <div className="flex flex-col gap-6">
          <Secao linhas={3} />
          <Secao linhas={6} />
        </div>
      </div>
    </Carregando>
  )
}
