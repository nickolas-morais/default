import type { Perfil } from '@/lib/perfis'

export type Alerta = {
  job_id: string
  entregavel_id: string | null
  tipo: 'sem_contrato' | 'alvara_pendente' | 'nf_pendente' | 'entrega_atrasada' | 'vigencia_fim'
  area: 'juridico' | 'financeiro' | 'atendimento' | 'comercial'
  severidade: 'critico' | 'atencao'
  descricao: string
}

export type Situacao = 'ativo' | 'finalizado' | 'cancelado'

/** foto_path só vem na ficha do job (a matriz não busca). */
export type TalentoNoJob = { nf_status: number; talento: { id: string; nome: string; foto_path?: string | null } }

export type JobLinha = {
  id: string
  codigo: string
  situacao: Situacao
  vigencia_fim: string
  alvara_exigido: boolean
  alvara_status: number
  jur_status: number
  adm_status: number
  nf_yzi_status: number
  est_status: number
  marca: { nome: string }
  vendedor: { nome: string }
  job_talentos: TalentoNoJob[]
  entregaveis: { id: string; status: number; data_prevista: string }[]
  job_valores: { valor_total: number } | null
}

export type Entregavel = {
  id: string
  descricao: string
  rede: string
  data_prevista: string
  status: number
  publicado_em: string | null
  talento: { id: string; nome: string }
}

export type JobDetalhe = {
  id: string
  codigo: string
  vigencia_inicio: string
  vigencia_fim: string
  alvara_exigido: boolean
  alvara_status: number
  alvara_validade: string | null
  jur_status: number
  adm_status: number
  nf_yzi_status: number
  est_status: number
  observacoes: string | null
  vendido_por: string
  situacao: Situacao
  encerrado_em: string | null
  motivo_cancelamento: string | null
  encerrador: { nome: string } | null
  marca: { nome: string }
  vendedor: { nome: string }
  atendimento: { nome: string } | null
  job_talentos: TalentoNoJob[]
  entregaveis: Entregavel[]
  job_valores: { valor_total: number; fee_yzi: number; condicoes_pagamento: string | null } | null
}

export type ItemHistorico = {
  id: number
  campo: string
  valor_anterior: string | null
  valor_novo: string | null
  created_at: string
  autor: { nome: string; foto_path: string | null } | null
  talento: { nome: string } | null
  entregavel: { descricao: string } | null
}

export type Arquivo = {
  id: string
  tipo: 'contrato' | 'nf_yzi' | 'nf_talento' | 'outro'
  nome: string
  created_at: string
  created_by: string | null
  autor: { nome: string } | null
  talento: { nome: string } | null
}

export type PessoaResumo = { id: string; nome: string; perfil: Perfil }
