import { Bloco, CabecalhoEsqueleto, Carregando, FormularioEsqueleto, ListaEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoUsuarios() {
  return (
    <Carregando rotulo="Carregando a equipe…">
      <CabecalhoEsqueleto />
      <FormularioEsqueleto secoes={1} />
      <div className="border-t border-line pt-8">
        <Bloco className="mb-3 h-4 w-40" />
        <ListaEsqueleto linhas={4} comAvatar />
      </div>
    </Carregando>
  )
}
