import { CabecalhoEsqueleto, Carregando, FormularioEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoPerfil() {
  return (
    <Carregando rotulo="Carregando seu perfil…">
      <CabecalhoEsqueleto />
      <FormularioEsqueleto secoes={3} />
    </Carregando>
  )
}
