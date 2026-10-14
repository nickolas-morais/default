'use client'

import { useState } from 'react'
import { Combobox, normalizar } from '@/components/ui/combobox'

type Opcao = { id: string; nome: string }

// Mostra no máximo isto de uma vez; digitar refina o resto.
const MAX_OPCOES = 50

/**
 * Select com busca para listas que crescem com os cadastros (pessoas, talentos, marcas).
 * Para listas fixas ou curtas (rede, perfil, ano), use o <Select> nativo.
 *
 * Com `name`, envia o id escolhido num campo oculto (formulários).
 * Com `valor` + `aoMudar`, funciona controlado (filtros).
 */
export function SelectBusca({
  id,
  name,
  opcoes,
  valor,
  valorInicial = '',
  aoMudar,
  vazio,
  placeholder = 'Buscar…',
  invalido,
}: {
  id: string
  name?: string
  opcoes: Opcao[]
  valor?: string
  valorInicial?: string
  aoMudar?: (id: string) => void
  /** Opção sem valor no topo da lista, ex.: "A definir" ou "Todas as analistas". */
  vazio?: string
  placeholder?: string
  invalido?: boolean
}) {
  const [interno, setInterno] = useState(valorInicial)
  const escolhido = valor ?? interno
  const rotuloDe = (v: string) => (v ? (opcoes.find((o) => o.id === v)?.nome ?? '') : (vazio ?? ''))
  const [texto, setTexto] = useState(() => rotuloDe(escolhido))
  // quando o valor muda por fora (ex.: filtro limpo pela URL), o texto acompanha
  const [ultimo, setUltimo] = useState(escolhido)
  if (ultimo !== escolhido) {
    setUltimo(escolhido)
    setTexto(rotuloDe(escolhido))
  }

  const termo = normalizar(texto)
  // com o rótulo da escolha atual no campo, mostra a lista inteira (para trocar)
  const mostrandoEscolha = texto === rotuloDe(escolhido)
  const filtradas = !termo || mostrandoEscolha ? opcoes : opcoes.filter((o) => normalizar(o.nome).includes(termo))

  function escolher(v: string) {
    if (valor === undefined) setInterno(v)
    setTexto(rotuloDe(v))
    aoMudar?.(v)
  }

  return (
    <>
      <Combobox
        id={id}
        texto={texto}
        placeholder={placeholder}
        invalido={invalido}
        opcoes={[
          ...(vazio !== undefined && (!termo || mostrandoEscolha) ? [{ id: '', rotulo: vazio }] : []),
          ...filtradas.slice(0, MAX_OPCOES).map((o) => ({ id: o.id, rotulo: o.nome })),
        ]}
        vazio="Nada encontrado."
        aoDigitar={setTexto}
        aoEscolher={escolher}
        // texto digitado que não virou escolha volta para a escolha atual
        aoSair={() => setTexto(rotuloDe(escolhido))}
      />
      {name ? <input type="hidden" name={name} value={escolhido} /> : null}
    </>
  )
}
