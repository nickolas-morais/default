'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSessao, mensagemErro } from '@/lib/sessao'
import { createAdminClient } from '@/lib/supabase/admin'

export type Resultado = { ok: true } | { ok: false; erro: string }

const Status = z.object({
  jobId: z.uuid(),
  alvo: z.enum(['jur', 'adm', 'alv', 'nf_yzi', 'nf_talento', 'est', 'ent']),
  valor: z.number().int().min(0).max(4),
  talentoId: z.uuid().optional(),
  entregavelId: z.uuid().optional(),
})

const COLUNA = { jur: 'jur_status', adm: 'adm_status', alv: 'alvara_status', nf_yzi: 'nf_yzi_status', est: 'est_status' } as const

export async function atualizarStatus(entrada: z.input<typeof Status>): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }
  const d = Status.safeParse(entrada)
  if (!d.success) return { ok: false, erro: 'Dados inválidos.' }
  const { supabase } = sessao
  const { jobId, alvo, valor } = d.data

  let resposta
  if (alvo === 'nf_talento') {
    if (!d.data.talentoId) return { ok: false, erro: 'Talento não informado.' }
    resposta = await supabase
      .from('job_talentos')
      .update({ nf_status: valor })
      .eq('job_id', jobId)
      .eq('talento_id', d.data.talentoId)
      .select('job_id')
  } else if (alvo === 'ent') {
    if (!d.data.entregavelId) return { ok: false, erro: 'Entrega não informada.' }
    resposta = await supabase
      .from('entregaveis')
      .update({ status: valor })
      .eq('job_id', jobId)
      .eq('id', d.data.entregavelId)
      .select('job_id')
  } else {
    resposta = await supabase.from('jobs').update({ [COLUNA[alvo]]: valor }).eq('id', jobId).select('id')
  }

  const { error, data } = resposta
  if (error) return { ok: false, erro: mensagemErro(error) }
  if (!data?.length) return { ok: false, erro: 'Registro não encontrado ou sem permissão.' }

  // 'layout' também recalcula o contador de alertas do menu, não só as páginas
  revalidatePath('/', 'layout')
  return { ok: true }
}

const TIPOS = ['contrato', 'nf_yzi', 'nf_talento', 'outro'] as const
const TAMANHO_MAX = 9 * 1024 * 1024
const ACEITOS = new Set(['application/pdf', 'application/xml', 'text/xml', 'image/png', 'image/jpeg'])

export async function enviarArquivo(_: Resultado | undefined, form: FormData): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }

  const jobId = z.uuid().safeParse(form.get('jobId'))
  const tipo = z.enum(TIPOS).safeParse(form.get('tipo'))
  const talentoRaw = form.get('talentoId')
  const arquivo = form.get('arquivo')
  if (!jobId.success || !tipo.success) return { ok: false, erro: 'Escolha o tipo do arquivo.' }
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: 'Selecione um arquivo.' }
  if (arquivo.size > TAMANHO_MAX) return { ok: false, erro: 'O arquivo passa de 9 MB. Envie uma versão menor.' }
  if (!ACEITOS.has(arquivo.type)) return { ok: false, erro: 'Formatos aceitos: PDF, XML, PNG e JPG.' }
  const talentoId = tipo.data === 'nf_talento' && typeof talentoRaw === 'string' && talentoRaw ? talentoRaw : null
  if (tipo.data === 'nf_talento' && !talentoId) return { ok: false, erro: 'Informe de qual talento é a NF.' }

  const { supabase, usuario } = sessao
  const seguro = arquivo.name.normalize('NFD').replace(/[^\w.-]+/g, '_').slice(-80)
  const caminho = `${jobId.data}/${tipo.data}/${crypto.randomUUID()}-${seguro}`

  const up = await supabase.storage.from('arquivos').upload(caminho, arquivo, { contentType: arquivo.type })
  if (up.error) return { ok: false, erro: 'Seu perfil não pode anexar este tipo de arquivo, ou o envio falhou.' }

  const { error } = await supabase.from('arquivos').insert({
    job_id: jobId.data,
    tipo: tipo.data,
    talento_id: talentoId,
    storage_path: caminho,
    nome: arquivo.name,
    created_by: usuario.id,
  })
  if (error) {
    await supabase.storage.from('arquivos').remove([caminho])
    return { ok: false, erro: mensagemErro(error) }
  }

  revalidatePath(`/jobs/${jobId.data}`)
  return { ok: true }
}

// ---------- Situação: finalizar, cancelar, reabrir, excluir ----------
// Quem pode é conferido pelo trigger guard_situacao_job (e pela policy jobs_delete);
// aqui só traduzimos o pedido e o erro.

const Situacao = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('finalizar'), jobId: z.uuid() }),
  z.object({ acao: z.literal('reabrir'), jobId: z.uuid() }),
  z.object({ acao: z.literal('cancelar'), jobId: z.uuid(), motivo: z.string().trim().min(3, 'Informe o motivo do cancelamento').max(500) }),
])

export async function mudarSituacao(entrada: z.input<typeof Situacao>): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }
  const d = Situacao.safeParse(entrada)
  if (!d.success) return { ok: false, erro: d.error.issues[0]?.message ?? 'Dados inválidos.' }

  const mudanca =
    d.data.acao === 'finalizar'
      ? { situacao: 'finalizado' as const }
      : d.data.acao === 'reabrir'
        ? { situacao: 'ativo' as const }
        : { situacao: 'cancelado' as const, motivo_cancelamento: d.data.motivo }

  const { data, error } = await sessao.supabase.from('jobs').update(mudanca).eq('id', d.data.jobId).select('id')
  if (error) return { ok: false, erro: mensagemErro(error) }
  if (!data?.length) return { ok: false, erro: 'Job não encontrado ou sem permissão.' }
  // situação muda alertas, agenda, carteira, metas e o contador do menu
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Só para job criado por engano: diretoria executiva, sem arquivos, confirmando o código. */
export async function excluirJob(entrada: { jobId: string; confirmacao: string }): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }
  const jobId = z.uuid().safeParse(entrada.jobId)
  if (!jobId.success) return { ok: false, erro: 'Job inválido.' }
  const { supabase } = sessao

  const { data: job } = await supabase.from('jobs').select('codigo').eq('id', jobId.data).maybeSingle()
  if (!job) return { ok: false, erro: 'Job não encontrado.' }
  if (entrada.confirmacao.trim().toUpperCase() !== job.codigo.toUpperCase()) {
    return { ok: false, erro: `Digite ${job.codigo} para confirmar.` }
  }

  // arquivos ficam no Storage; apagar o job deixaria os documentos órfãos
  const { count } = await supabase.from('arquivos').select('id', { count: 'exact', head: true }).eq('job_id', jobId.data)
  if (count) return { ok: false, erro: 'Este job tem arquivos anexados. Cancele em vez de excluir.' }

  const { data, error } = await supabase.from('jobs').delete().eq('id', jobId.data).select('id')
  if (error) return { ok: false, erro: mensagemErro(error) }
  if (!data?.length) return { ok: false, erro: 'Somente a diretoria executiva exclui jobs.' }
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ---------- Entregas: incluir, editar, excluir (na própria ficha) ----------

export type EstadoEntrega = { ok?: string; erro?: string } | undefined

const Entrega = z.object({
  jobId: z.uuid(),
  descricao: z.string().trim().min(1, 'Descreva a entrega').max(200),
  talento_id: z.uuid({ error: 'Escolha o talento' }),
  rede: z.string().trim().min(1, 'Escolha a rede'),
  data_prevista: z.iso.date({ error: 'Informe a data prevista' }),
})

export async function salvarEntrega(_: EstadoEntrega, form: FormData): Promise<EstadoEntrega> {
  const sessao = await getSessao()
  if (!sessao) return { erro: 'Sua sessão expirou. Entre novamente.' }
  const d = Entrega.safeParse(Object.fromEntries(form))
  if (!d.success) return { erro: d.error.issues[0]?.message }
  const { supabase } = sessao
  const { jobId, ...campos } = d.data
  const id = form.get('id')

  let resposta
  if (typeof id === 'string' && id) {
    resposta = await supabase.from('entregaveis').update(campos).eq('id', id).eq('job_id', jobId).select('id')
  } else {
    // nova entrega vai para o fim da lista
    const { data: ultima } = await supabase
      .from('entregaveis')
      .select('ordem')
      .eq('job_id', jobId)
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle()
    resposta = await supabase
      .from('entregaveis')
      .insert({ job_id: jobId, ...campos, ordem: (ultima?.ordem ?? -1) + 1 })
      .select('id')
  }
  if (resposta.error) return { erro: mensagemErro(resposta.error) }
  if (!resposta.data?.length) return { erro: 'Seu perfil não pode alterar esta entrega.' }
  revalidatePath('/', 'layout')
  return { ok: typeof id === 'string' && id ? 'Entrega atualizada.' : 'Entrega adicionada.' }
}

export async function excluirEntrega(entrada: { jobId: string; id: string }): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }
  const jobId = z.uuid().safeParse(entrada.jobId)
  const id = z.uuid().safeParse(entrada.id)
  if (!jobId.success || !id.success) return { ok: false, erro: 'Entrega inválida.' }
  const { data, error } = await sessao.supabase.from('entregaveis').delete().eq('id', id.data).eq('job_id', jobId.data).select('id')
  if (error) return { ok: false, erro: mensagemErro(error) }
  if (!data?.length) return { ok: false, erro: 'Seu perfil não pode excluir entregas.' }
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ---------- Validade do alvará (Jurídico; guard_jobs confere quem pode) ----------

export async function salvarValidadeAlvara(entrada: { jobId: string; validade: string | null }): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }
  const jobId = z.uuid().safeParse(entrada.jobId)
  const validade = z.iso.date().nullable().safeParse(entrada.validade || null)
  if (!jobId.success || !validade.success) return { ok: false, erro: 'Data inválida.' }
  const { data, error } = await sessao.supabase.from('jobs').update({ alvara_validade: validade.data }).eq('id', jobId.data).select('id')
  if (error) return { ok: false, erro: mensagemErro(error) }
  if (!data?.length) return { ok: false, erro: 'Job não encontrado ou sem permissão.' }
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ---------- Excluir arquivo anexado ----------
// Quem pode: quem enviou ou a diretoria executiva (policy arquivos_delete).

export async function excluirArquivo(entrada: { jobId: string; id: string }): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }
  const jobId = z.uuid().safeParse(entrada.jobId)
  const id = z.uuid().safeParse(entrada.id)
  if (!jobId.success || !id.success) return { ok: false, erro: 'Arquivo inválido.' }
  const { supabase } = sessao

  // coerente com o envio: job encerrado não muda (reabra para alterar)
  const { data: job } = await supabase.from('jobs').select('situacao').eq('id', jobId.data).maybeSingle()
  if (job && job.situacao !== 'ativo') return { ok: false, erro: 'Reabra o job para excluir arquivos.' }

  // o RLS decide se pode; o registro volta com o caminho do arquivo no Storage
  const { data, error } = await supabase.from('arquivos').delete().eq('id', id.data).eq('job_id', jobId.data).select('storage_path')
  if (error) return { ok: false, erro: mensagemErro(error) }
  if (!data?.length) return { ok: false, erro: 'Só quem enviou o arquivo ou a diretoria executiva pode excluí-lo.' }

  // o bucket não tem policy de delete; a permissão já foi conferida acima, então a service role apaga o arquivo
  await createAdminClient().storage.from('arquivos').remove([data[0].storage_path as string])
  revalidatePath(`/jobs/${jobId.data}`)
  return { ok: true }
}
