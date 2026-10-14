import { Bloco, CabecalhoEsqueleto, Carregando, ListaEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoMetas() {
  return (
    <Carregando rotulo="Carregando as metas comerciais…">
      <CabecalhoEsqueleto />
      <div className="mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 bg-surface px-5 py-4">
            <Bloco className="h-3 w-24" />
            <Bloco className="h-6 w-36" />
          </div>
        ))}
      </div>
      <ListaEsqueleto linhas={4} comAvatar />
    </Carregando>
  )
}
