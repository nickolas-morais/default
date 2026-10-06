import { Bloco, CabecalhoEsqueleto, Carregando, FiltrosEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoTalentos() {
  return (
    <Carregando rotulo="Carregando a carteira de talentos…">
      <CabecalhoEsqueleto />
      <FiltrosEsqueleto abas={3} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-[10px] border border-line bg-surface">
            <div className="flex items-center gap-3 px-5 pb-4 pt-5">
              <Bloco className="size-11 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Bloco className="h-4 w-32" />
                <Bloco className="h-3 w-24" />
              </div>
            </div>
            <div className="flex flex-col gap-2.5 border-y border-line px-5 py-3">
              <Bloco className="h-3.5 w-full" />
              <Bloco className="h-3.5 w-full" />
            </div>
            <div className="flex flex-col gap-2 px-5 py-4">
              <Bloco className="h-3 w-16" />
              <Bloco className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </Carregando>
  )
}
