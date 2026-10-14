// Espelho das regras do banco para a interface (habilitar/desabilitar controles).
// A validação real acontece nas policies e triggers do Postgres.

export const PERFIS = [
  'diretoria_executiva',
  'diretora_comercial',
  'analista_comercial',
  'gerente_jaf',
  'analista_financeiro',
  'analista_juridico_adm',
  'diretora_estrategica',
  'gerencia_atendimento',
  'analista_atendimento',
] as const

export type Perfil = (typeof PERFIS)[number]

export const PERFIL_LABEL: Record<Perfil, string> = {
  diretoria_executiva: 'Diretoria executiva',
  diretora_comercial: 'Diretora comercial',
  analista_comercial: 'Analista comercial',
  gerente_jaf: 'Gerente jurídico/adm/financeiro',
  analista_financeiro: 'Analista financeiro',
  analista_juridico_adm: 'Analista jurídico/adm',
  diretora_estrategica: 'Diretora estratégica',
  gerencia_atendimento: 'Gerência de atendimento',
  analista_atendimento: 'Analista de atendimento',
}

const VE_TODOS: ReadonlySet<Perfil> = new Set([
  'diretoria_executiva',
  'diretora_comercial',
  'gerente_jaf',
  'analista_financeiro',
])

export function veTodosValores(p: Perfil) {
  return VE_TODOS.has(p)
}

/** Pode ver valores de algum job? (define se a tela de metas aparece) */
export function veAlgumValor(p: Perfil) {
  return VE_TODOS.has(p) || p === 'analista_comercial'
}

export type Alvo = 'jur' | 'adm' | 'alv' | 'nf_yzi' | 'nf_talento' | 'est' | 'ent'

const QUEM_ALTERA: Record<Alvo, ReadonlySet<Perfil>> = {
  jur: new Set(['gerente_jaf', 'analista_juridico_adm']),
  adm: new Set(['gerente_jaf', 'analista_juridico_adm']),
  alv: new Set(['gerente_jaf', 'analista_juridico_adm']),
  nf_yzi: new Set(['gerente_jaf', 'analista_financeiro']),
  nf_talento: new Set(['gerente_jaf', 'analista_financeiro']),
  est: new Set(['diretora_estrategica']),
  ent: new Set(['gerencia_atendimento', 'analista_atendimento']),
}

export function podeAlterar(p: Perfil, alvo: Alvo) {
  return p === 'diretoria_executiva' || QUEM_ALTERA[alvo].has(p)
}

export function podeCriarJob(p: Perfil) {
  return p === 'diretoria_executiva' || p === 'diretora_comercial' || p === 'analista_comercial'
}

export function escolheVendedor(p: Perfil) {
  return p === 'diretoria_executiva' || p === 'diretora_comercial'
}

const ROTULO_ALVO: Record<Alvo, string> = {
  jur: 'Jurídico',
  adm: 'Administrativo',
  alv: 'alvará',
  nf_yzi: 'NF da YZI',
  nf_talento: 'NFs dos talentos',
  est: 'trilha de Estratégia',
  ent: 'status das entregas',
}

function lista(itens: string[]) {
  return itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`
}

/** Resumo em linguagem simples do que o perfil vê e altera, para a página "Meu perfil". */
export function resumoPermissoes(p: Perfil): { ve: string[]; altera: string[] } {
  const ve = [
    'Matriz de status, agenda, alertas e talentos de todos os jobs',
    VE_TODOS.has(p)
      ? 'Valores de todos os jobs, com NFs e contratos anexados'
      : p === 'analista_comercial'
        ? 'Valores só dos jobs que você vendeu, com as NFs e os contratos deles'
        : 'Os valores dos jobs ficam ocultos para o seu perfil',
    ...(p === 'analista_juridico_adm' ? ['Contratos anexados aos jobs'] : []),
    ...(veAlgumValor(p) ? [p === 'analista_comercial' ? 'A sua meta comercial e as suas vendas' : 'As metas comerciais de todas as analistas'] : []),
  ]

  if (p === 'diretoria_executiva') return { ve, altera: ['Tudo no sistema, inclusive usuários e perfis'] }

  const trilhas = (Object.keys(QUEM_ALTERA) as Alvo[]).filter((a) => podeAlterar(p, a)).map((a) => ROTULO_ALVO[a])
  const altera = [
    ...(podeCriarJob(p) ? ['Cria jobs e cadastra talentos'] : []),
    ...(p === 'diretora_comercial' ? ['Ficha, valores e metas de qualquer job; transfere jobs entre analistas'] : []),
    ...(p === 'analista_comercial' ? ['Ficha e valores dos jobs que você vendeu'] : []),
    ...(p === 'diretora_comercial' ? ['Finaliza, cancela e reabre qualquer job'] : []),
    ...(p === 'analista_comercial' ? ['Finaliza, cancela e reabre os jobs que você vendeu'] : []),
    ...(p === 'gerencia_atendimento' ? ['Inclui, edita e exclui entregas dos jobs'] : []),
    ...(p === 'analista_atendimento' ? ['Inclui e edita entregas dos jobs'] : []),
    ...(trilhas.length ? [`Status de ${lista(trilhas)}`] : []),
  ]
  return { ve, altera: altera.length ? altera : ['Nada: seu acesso é só de consulta'] }
}

/** Finalizar, cancelar e reabrir: o Comercial responsável (mesma regra do trigger guard_situacao_job). */
export function podeEncerrar(p: Perfil, vendidoPor: string, usuarioId: string) {
  return p === 'diretoria_executiva' || p === 'diretora_comercial' || (p === 'analista_comercial' && vendidoPor === usuarioId)
}

/** Excluir de vez: só a diretoria executiva (policy jobs_delete), e a tela ainda exige job sem arquivos. */
export function podeExcluirJob(p: Perfil) {
  return p === 'diretoria_executiva'
}

/** Ficha, valores e talentos do job: o mesmo Comercial que encerra (função e_comercial_do_job no banco). */
export const podeEditarJob = podeEncerrar

/** Transferir o job para outra analista (guard_jobs). */
export function podeTrocarVendedor(p: Perfil) {
  return p === 'diretoria_executiva' || p === 'diretora_comercial'
}

/** Incluir e editar entregas: Comercial responsável ou Atendimento (ent_insert e guard_entregaveis). */
export function podeEditarEntregas(p: Perfil, vendidoPor: string, usuarioId: string) {
  return podeEncerrar(p, vendidoPor, usuarioId) || p === 'gerencia_atendimento' || p === 'analista_atendimento'
}

/** Excluir entrega (policy ent_delete); a publicada nunca sai (guard_excluir_entregavel). */
export function podeExcluirEntrega(p: Perfil) {
  return p === 'diretoria_executiva' || p === 'diretora_comercial' || p === 'gerencia_atendimento'
}
