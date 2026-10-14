import { data } from '@/lib/format'
import { PERFIL_LABEL, type Perfil } from '@/lib/perfis'
import { rotulo, type Trilha } from '@/lib/status'
import type { ItemHistorico } from '@/types/dominio'

const STATUS: Record<string, [string, Trilha]> = {
  jur_status: ['Jurídico', 'jur'],
  adm_status: ['Administrativo', 'adm'],
  nf_yzi_status: ['NF da YZI', 'nf'],
  est_status: ['Estratégia', 'est'],
  alvara_status: ['Alvará', 'alv'],
}

/** Frase legível para uma linha do histórico. */
export function descreverHistorico(h: ItemHistorico): string {
  const st = STATUS[h.campo]
  if (st) return `${st[0]}: ${rotulo(st[1], Number(h.valor_anterior))} → ${rotulo(st[1], Number(h.valor_novo))}`

  switch (h.campo) {
    case 'job_criado':
      return `criou o job ${h.valor_novo ?? ''}`.trim()
    case 'situacao':
      if (h.valor_novo === 'finalizado') return 'finalizou o job'
      if (h.valor_novo === 'ativo') return 'reabriu o job'
      // gravado como "cancelado: <motivo>" (trigger log_situacao_job)
      return h.valor_novo?.startsWith('cancelado: ') ? `cancelou o job. Motivo: ${h.valor_novo.slice(11)}` : 'cancelou o job'
    case 'nf_talento':
      return `NF de ${h.talento?.nome ?? 'talento'}: ${rotulo('nf', Number(h.valor_anterior))} → ${rotulo('nf', Number(h.valor_novo))}`
    case 'entregavel_criado':
      return `adicionou a entrega “${h.valor_novo}”`
    case 'entregavel_removido':
      return `excluiu a entrega “${h.valor_anterior}”`
    case 'talento_adicionado':
      return `adicionou ${h.talento?.nome ?? h.valor_novo ?? 'um talento'} ao job`
    case 'talento_removido':
      return `removeu ${h.talento?.nome ?? h.valor_novo ?? 'um talento'} do job`
    case 'entregavel_status':
      return `${h.entregavel?.descricao ?? 'Entrega'}: ${rotulo('ent', Number(h.valor_anterior))} → ${rotulo('ent', Number(h.valor_novo))}`
    case 'entregavel_data':
      return `${h.entregavel?.descricao ?? 'Entrega'}: data ${data(h.valor_anterior)} → ${data(h.valor_novo)}`
    case 'valores_definidos':
      return 'definiu os valores do job'
    case 'valores_alterados':
      return 'alterou os valores do job'
    case 'alvara_exigido':
      return h.valor_novo === 'true' ? 'passou a exigir alvará' : 'deixou de exigir alvará'
    case 'alvara_validade':
      return `validade do alvará: ${data(h.valor_novo)}`
    case 'vigencia_inicio':
      return `início da vigência: ${data(h.valor_anterior)} → ${data(h.valor_novo)}`
    case 'vigencia_fim':
      return `fim da vigência: ${data(h.valor_anterior)} → ${data(h.valor_novo)}`
    case 'vendido_por':
      return 'transferiu o job para outra analista'
    case 'atendimento_id':
      return 'trocou o responsável no atendimento'
    case 'marca_id':
      return 'trocou a marca'
    default:
      return h.campo
  }
}

// ---------- Histórico da equipe (tela de Usuários) ----------

export type ItemHistoricoEquipe = {
  id: number
  campo: string
  alvo_nome: string
  valor_anterior: string | null
  valor_novo: string | null
  created_at: string
  autor: { nome: string; foto_path: string | null } | null
}

const perfilLabel = (v: string | null) => (v && v in PERFIL_LABEL ? PERFIL_LABEL[v as Perfil] : (v ?? '—'))

/** Frase legível para uma mudança na equipe (o autor aparece antes, em negrito). */
export function descreverHistoricoEquipe(h: ItemHistoricoEquipe): string {
  switch (h.campo) {
    case 'convite':
      return `convidou ${h.alvo_nome} como ${perfilLabel(h.valor_novo)}`
    case 'convite_excluido':
      return `excluiu o convite de ${h.alvo_nome}${h.valor_anterior ? ` (${h.valor_anterior})` : ''}`
    case 'nome':
      return `renomeou ${h.valor_anterior} para ${h.valor_novo}`
    case 'email':
      return `trocou o e-mail de ${h.alvo_nome}: ${h.valor_anterior} → ${h.valor_novo}`
    case 'perfil':
      return `mudou o perfil de ${h.alvo_nome}: ${perfilLabel(h.valor_anterior)} → ${perfilLabel(h.valor_novo)}`
    case 'ativo':
      return h.valor_novo === 'true' ? `reativou o acesso de ${h.alvo_nome}` : `desativou o acesso de ${h.alvo_nome}`
    default:
      return `alterou ${h.alvo_nome}`
  }
}
