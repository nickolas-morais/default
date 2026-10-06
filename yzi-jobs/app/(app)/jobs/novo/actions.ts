'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { escolheVendedor, podeCriarJob } from '@/lib/perfis'
import { getSessao, mensagemErro } from '@/lib/sessao'
import { dataISO, dinheiro } from '@/lib/validacao'

export type EstadoNovoJob = { erro?: string; campos?: Record<string, string>; criado?: string } | undefined

const NovoJob = z
  .object({
    marca_id: z.string(),
    marca_nome: z.string().trim(),
    vigencia_inicio: dataISO,
    vigencia_fim: dataISO,
    alvara_exigido: z.boolean(),
    vendido_por: z.uuid(),
    atendimento_id: z.string(),
    observacoes: z.string().max(2000),
    talentos: z.array(z.uuid()).min(1, 'Selecione pelo menos um talento'),
    entregaveis: z.array(
      z.object({
        descricao: z.string().trim().min(1, 'Descreva cada entrega'),
        talento_id: z.uuid({ error: 'Escolha o talento de cada entrega' }),
        rede: z.string().trim().min(1, 'Informe a rede de cada entrega'),
        data_prevista: dataISO,
        ordem: z.number(),
      }),
    ),
    valor_total: dinheiro,
    fee_yzi: dinheiro,
    condicoes_pagamento: z.string().max(500),
  })
  .refine((d) => d.vigencia_fim >= d.vigencia_inicio, { message: 'O fim da vigência é antes do início', path: ['vigencia_fim'] })
  .refine((d) => d.fee_yzi <= d.valor_total, { message: 'O fee da YZI não pode passar do valor do job', path: ['fee_yzi'] })
  .refine((d) => d.marca_id !== '', { message: 'Escolha a marca ou cadastre uma nova', path: ['marca_id'] })
  .refine((d) => d.marca_id !== '__nova' || d.marca_nome.length > 0, { message: 'Informe o nome da nova marca', path: ['marca_id'] })
  .refine((d) => d.entregaveis.every((e) => d.talentos.includes(e.talento_id)), {
    message: 'Cada entrega precisa ser de um talento marcado no job',
    path: ['entregaveis'],
  })

export async function criarJob(_: EstadoNovoJob, form: FormData): Promise<EstadoNovoJob> {
  const sessao = await getSessao()
  if (!sessao) return { erro: 'Sua sessão expirou. Entre novamente.' }
  const { supabase, usuario } = sessao
  if (!podeCriarJob(usuario.perfil)) return { erro: 'Seu perfil não cria jobs.' }

  const texto = (k: string) => String(form.get(k) ?? '')
  const descricoes = form.getAll('ent_descricao').map(String)
  const entregaveis = descricoes.map((descricao, i) => ({
    descricao,
    talento_id: String(form.getAll('ent_talento')[i] ?? ''),
    rede: String(form.getAll('ent_rede')[i] ?? ''),
    data_prevista: String(form.getAll('ent_data')[i] ?? ''),
    ordem: i,
  }))

  const d = NovoJob.safeParse({
    marca_id: texto('marca_id'),
    marca_nome: texto('marca_nome'),
    vigencia_inicio: texto('vigencia_inicio'),
    vigencia_fim: texto('vigencia_fim'),
    alvara_exigido: form.get('alvara_exigido') === 'on',
    // analista comercial sempre cria em nome próprio
    vendido_por: escolheVendedor(usuario.perfil) ? texto('vendido_por') : usuario.id,
    atendimento_id: texto('atendimento_id'),
    observacoes: texto('observacoes'),
    talentos: form.getAll('talentos').map(String),
    entregaveis,
    valor_total: texto('valor_total'),
    fee_yzi: texto('fee_yzi'),
    condicoes_pagamento: texto('condicoes_pagamento'),
  })

  if (!d.success) {
    const campos: Record<string, string> = {}
    for (const issue of d.error.issues) {
      const chave = String(issue.path[0] ?? 'geral')
      campos[chave] ??= issue.message
    }
    return { erro: 'Revise os campos destacados.', campos }
  }

  const { marca_id, ...resto } = d.data
  const { data: id, error } = await supabase.rpc('criar_job', {
    p: { ...resto, marca_id: marca_id === '__nova' ? '' : marca_id },
  })
  if (error) return { erro: mensagemErro(error) }
  // job novo pode abrir alertas: recalcula o contador do menu e a matriz.
  // Devolve o id em vez de redirecionar aqui: a tela mostra o toast e então abre o job.
  revalidatePath('/', 'layout')
  return { criado: String(id) }
}
