import { Bloco, CabecalhoEsqueleto, Carregando, FormularioEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoEdicao() {
  return (
    <Carregando rotulo="Carregando o job…">
      <Bloco className="mb-4 h-3.5 w-56" />
      <CabecalhoEsqueleto />
      <FormularioEsqueleto secoes={4} />
    </Carregando>
  )
}
