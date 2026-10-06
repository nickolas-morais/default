import { Bloco, CabecalhoEsqueleto, Carregando, FiltrosEsqueleto, ListaEsqueleto } from '@/components/ui/esqueleto'

export default function CarregandoCadastros() {
  return (
    <Carregando rotulo="Carregando os cadastros…">
      <CabecalhoEsqueleto />
      <div className="mb-6 flex gap-6 border-b border-line pb-2.5">
        <Bloco className="h-4 w-16" />
        <Bloco className="h-4 w-14" />
        <Bloco className="h-4 w-12" />
      </div>
      <FiltrosEsqueleto abas={3} comSelect={false} />
      <ListaEsqueleto linhas={6} comAvatar />
    </Carregando>
  )
}
