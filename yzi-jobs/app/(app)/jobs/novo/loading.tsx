import { Bloco, CabecalhoEsqueleto, Carregando, FormularioEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoNovoJob() {
  return (
    <Carregando rotulo="Carregando o formulário…">
      <Bloco className="mb-4 h-3.5 w-48" />
      <CabecalhoEsqueleto />
      <FormularioEsqueleto secoes={4} />
    </Carregando>
  )
}
