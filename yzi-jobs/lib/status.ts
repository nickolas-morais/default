// Rótulos das etapas de cada trilha. O banco guarda o índice (smallint);
// renomear uma etapa aqui não exige migração.

export const ETAPAS = {
  jur: ['Aguardando minuta', 'Em negociação', 'Enviado p/ assinatura', 'Assinado'],
  adm: ['Cadastro pendente', 'Documentos enviados', 'Concluído'],
  nf: ['Aguardando autorização', 'Emitida', 'Enviada à marca', 'Paga'],
  ent: ['Briefing', 'Roteiro', 'Produção', 'Aprovação da marca', 'Publicado'],
  est: ['Não acionada', 'Acionada', 'Concluída'],
  alv: ['A solicitar', 'Solicitado', 'Emitido'],
} as const

/** Versões curtas para a matriz compacta (mesma ordem de ETAPAS). */
export const ETAPAS_CURTAS: Record<keyof typeof ETAPAS, readonly string[]> = {
  jur: ['Minuta', 'Negociação', 'Assinatura', 'Assinado'],
  adm: ['Pendente', 'Enviados', 'Concluído'],
  nf: ['Autorização', 'Emitida', 'Enviada', 'Paga'],
  ent: ['Briefing', 'Roteiro', 'Produção', 'Aprovação', 'Publicado'],
  // "Não acionada" é o estado normal da Estratégia; o traço tira ruído da matriz
  est: ['—', 'Acionada', 'Concluída'],
  alv: ['A solicitar', 'Solicitado', 'Emitido'],
}

export type Trilha = keyof typeof ETAPAS
export type Tom = 'done' | 'prog' | 'idle' | 'off'

export const ENT_PUBLICADO = ETAPAS.ent.length - 1

export function rotulo(trilha: Trilha, indice: number): string {
  return ETAPAS[trilha][indice] ?? '—'
}

export function tom(trilha: Trilha, indice: number): Tom {
  if (trilha === 'est' && indice === 0) return 'off'
  if (indice >= ETAPAS[trilha].length - 1) return 'done'
  return indice === 0 ? 'idle' : 'prog'
}

export const REDES = ['Instagram', 'TikTok', 'YouTube', 'Spotify', 'Programa / podcast', 'Outra'] as const

// ---------- Situação do job ----------

export const SITUACAO_LABEL = { ativo: 'Ativo', finalizado: 'Finalizado', cancelado: 'Cancelado' } as const

type JobParaFinalizar = {
  jur_status: number
  adm_status: number
  nf_yzi_status: number
  est_status: number
  alvara_exigido: boolean
  alvara_status: number
  job_talentos: { nf_status: number }[]
  entregaveis: { status: number }[]
}

/**
 * Todas as áreas concluídas: sugere "Pronto para finalizar" (a decisão continua manual).
 * Estratégia conta como pronta se não foi acionada ou se já concluiu.
 */
export function prontoParaFinalizar(j: JobParaFinalizar) {
  const ultima = (t: Trilha) => ETAPAS[t].length - 1
  return (
    j.jur_status === ultima('jur') &&
    j.adm_status === ultima('adm') &&
    j.nf_yzi_status === ultima('nf') &&
    j.job_talentos.every((t) => t.nf_status === ultima('nf')) &&
    (j.est_status === 0 || j.est_status === ultima('est')) &&
    (!j.alvara_exigido || j.alvara_status === ultima('alv')) &&
    j.entregaveis.length > 0 &&
    j.entregaveis.every((e) => e.status === ENT_PUBLICADO)
  )
}

/** Visões da matriz de status (parâmetro ?ver= na URL; sem parâmetro = ativos). */
export const VISOES_MATRIZ = [
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'alerta', rotulo: 'Com alerta' },
  { valor: 'finalizados', rotulo: 'Finalizados' },
  { valor: 'cancelados', rotulo: 'Cancelados' },
  { valor: 'todos', rotulo: 'Todos' },
] as const
export type VisaoMatriz = (typeof VISOES_MATRIZ)[number]['valor']

export function lerVisaoMatriz(v: string | undefined): VisaoMatriz {
  return VISOES_MATRIZ.some((x) => x.valor === v) ? (v as VisaoMatriz) : 'ativos'
}

/** Itens por página na matriz. Fica aqui (e não no componente 'use client') para a página do servidor também ler o valor. */
export const OPCOES_MATRIZ = [25, 50, 100] as const
