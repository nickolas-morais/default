import { Bloco, CabecalhoEsqueleto, Carregando, FiltrosEsqueleto } from '@/components/ui/esqueleto'

// Matriz de status (e fallback das rotas sem loading próprio).
export default function CarregandoMatriz() {
  return (
    <Carregando rotulo="Carregando a matriz de status…">
      <CabecalhoEsqueleto comAcao />
      <FiltrosEsqueleto abas={5} />
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
        <div className="h-10 border-b border-line bg-sunken" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-line px-4 py-4 last:border-0">
            <div className="flex w-56 shrink-0 flex-col gap-2">
              <Bloco className="h-3.5 w-44" />
              <Bloco className="h-3 w-28" />
            </div>
            {Array.from({ length: 6 }, (_, j) => (
              <div key={j} className={`flex-1 flex-col gap-1.5 ${j > 1 ? 'hidden xl:flex' : 'hidden sm:flex'}`}>
                <Bloco className="h-1 w-full" />
                <Bloco className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Carregando>
  )
}
