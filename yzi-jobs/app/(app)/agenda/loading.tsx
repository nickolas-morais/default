import { Bloco, CabecalhoEsqueleto, Carregando, ListaEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoAgenda() {
  return (
    <Carregando rotulo="Carregando a agenda de entregas…">
      <CabecalhoEsqueleto />
      <div className="flex flex-col gap-8">
        {[3, 4].map((linhas, i) => (
          <div key={i}>
            <Bloco className="mb-2.5 h-4 w-40" />
            <ListaEsqueleto linhas={linhas} />
          </div>
        ))}
      </div>
    </Carregando>
  )
}
