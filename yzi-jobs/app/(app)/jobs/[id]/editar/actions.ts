'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { podeTrocarVendedor } from '@/lib/perfis'
import { getSessao, mensagemErro } from '@/lib/sessao'
import { dataISO, dinheiro, errosPorCampo } from '@/lib/validacao'

export type EstadoEdicao = { erro?: string; campos?: Record<string, string>; salvo?: boolean } | undefined

const Edicao = z
  .object({
    id: z.uuid(),
    marca_id: z.string(),
    marca_nome: z.string().trim(),
    vigencia_inicio: dataISO,
    vigencia_fim: dataISO,
    alvara_exigido: z.boolean(),
    atendimento_id: z.string(),
    observacoes: z.string().max(2000),
    talentos: z.array(z.uuid()).min(1, 'O job precisa ter pelo menos um talento'),
  })
  .refine((d) => d.vigencia_fim >= d.vigencia_inicio, { message: 'O fim da vigência é antes do início', path: ['vigencia_fim'] })
  .refine((d) => d.marca_id !== '', { message: 'Escolha a marca ou cadastre uma nova', path: ['marca_id'] })
  .refine((d) => d.marca_id !== '__nova' || d.marca_nome.length > 0, { message: 'Informe o nome da nova marca', path: ['marca_id'] })

const Valores = z
  .object({ valor_total: dinheiro, fee_yzi: dinheiro, condicoes_pagamento: z.string().max(500) })
  .refine((d) => d.fee_yzi <= d.valor_total, { message: 'O fee da YZI não pode passar do valor do job', path: ['fee_yzi'] })

export async function salvarEdicaoJob(_: EstadoEdicao, form: FormData): Promise<EstadoEdicao> {
  const sessao = await getSessao()
  if (!sessao) return { erro: 'Sua sessão expirou. Entre novamente.' }
  const { supabase, usuario } = sessao
  const texto = (k: string) => String(form.get(k) ?? '')

  const d = Edicao.safeParse({
    id: texto('id'),
    marca_id: texto('marca_id'),
    marca_nome: texto('marca_nome'),
    vigencia_inicio: texto('vigencia_inicio'),
    vigencia_fim: texto('vigencia_fim'),
    alvara_exigido: form.get('alvara_exigido') === 'on',
    atendimento_id: texto('atendimento_id'),
    observacoes: texto('observacoes'),
    talentos: form.getAll('talentos').map(String),
  })
  // valores só vêm no formulário para quem pode alterá-los
  const comValores = form.has('valor_total')
  const v = comValores
    ? Valores.safeParse({ valor_total: texto('valor_total'), fee_yzi: texto('fee_yzi'), condicoes_pagamento: texto('condicoes_pagamento') })
    : null

  if (!d.success || (v && !v.success)) {
    const campos = { ...(d.success ? {} : errosPorCampo(d.error.issues)), ...(v && !v.success ? errosPorCampo(v.error.issues) : {}) }
    return { erro: 'Revise os campos destacados.', campos }
  }

  const { marca_id, ...resto } = d.data
  const p = {
    ...resto,
    marca_id: marca_id === '__nova' ? '' : marca_id,
    // transferir para outra analista: só diretoria e diretora comercial (o banco também confere)
    ...(podeTrocarVendedor(usuario.perfil) && texto('vendido_por') ? { vendido_por: texto('vendido_por') } : {}),
    ...(v?.success ? v.data : {}),
  }

  const { error } = await supabase.rpc('editar_job', { p })
  if (error) return { erro: mensagemErro(error) }
  // marca, vigência, talentos e valores aparecem na matriz, na agenda, nos alertas e nas metas
  revalidatePath('/', 'layout')
  return { salvo: true }
}
