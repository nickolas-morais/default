import { Bloco, CabecalhoEsqueleto, Carregando, ListaEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoAlertas() {
  return (
    <Carregando rotulo="Carregando os alertas…">
      <CabecalhoEsqueleto />
      <Bloco className="mb-2.5 h-4 w-32" />
      <ListaEsqueleto linhas={4} />
    </Carregando>
  )
}
