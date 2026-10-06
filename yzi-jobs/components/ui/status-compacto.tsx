import { ETAPAS, ETAPAS_CURTAS, rotulo, tom, type Tom, type Trilha } from '@/lib/status'

const COR_TEXTO: Record<Tom, string> = {
  done: 'text-done',
  prog: 'text-prog',
  idle: 'text-muted',
  off: 'text-muted',
}

const COR_BARRA: Record<Tom, string> = {
  done: 'bg-done',
  prog: 'bg-prog',
  idle: 'bg-line-strong',
  off: 'bg-line-strong',
}

/**
 * Status em formato de matriz: uma barrinha por passo concluído + rótulo curto.
 * O rótulo completo vai no title (mouse) e no texto para leitores de tela.
 */
export function StatusCompacto({ trilha, valor }: { trilha: Trilha; valor: number }) {
  const t = tom(trilha, valor)
  const passos = ETAPAS[trilha].length - 1
  const completo = rotulo(trilha, valor)
  return (
    <span title={completo} className="flex min-w-0 flex-col gap-1">
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: passos }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < valor ? COR_BARRA[t] : 'bg-idle-soft'}`} />
        ))}
      </span>
      <span aria-hidden="true" className={`truncate text-[12.5px] font-medium ${COR_TEXTO[t]}`}>
        {ETAPAS_CURTAS[trilha][valor] ?? completo}
      </span>
      <span className="sr-only">{completo}</span>
    </span>
  )
}

/** Célula vazia de propósito (ex.: alvará não exigido). */
export function NaoSeAplica({ texto }: { texto: string }) {
  return <span className="text-[12.5px] text-muted">{texto}</span>
}

/**
 * NF de vários talentos numa célula só: uma barrinha por talento (cor da etapa de cada um)
 * e o resumo "1 de 2 pagas". O detalhe por talento vai no title e no texto para leitor de tela.
 */
export function NfTalentosCompacto({ talentos }: { talentos: { nome: string; nf_status: number }[] }) {
  const ultima = ETAPAS.nf.length - 1
  const pagas = talentos.filter((t) => t.nf_status === ultima).length
  const algumaAndando = talentos.some((t) => t.nf_status > 0)
  const t: Tom = pagas === talentos.length ? 'done' : algumaAndando ? 'prog' : 'idle'
  const detalhe = talentos.map((x) => `${x.nome}: ${rotulo('nf', x.nf_status)}`).join('; ')

  return (
    <span title={detalhe} className="flex min-w-0 flex-col gap-1">
      <span aria-hidden="true" className="flex gap-0.5">
        {talentos.map((x, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${COR_BARRA[tom('nf', x.nf_status)]}`} />
        ))}
      </span>
      <span aria-hidden="true" className={`truncate text-[12.5px] font-medium ${COR_TEXTO[t]}`}>
        {pagas} de {talentos.length} pagas
      </span>
      <span className="sr-only">{detalhe}</span>
    </span>
  )
}
