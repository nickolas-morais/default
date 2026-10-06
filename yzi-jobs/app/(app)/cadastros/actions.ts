'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSessao, mensagemErro } from '@/lib/sessao'

export type Estado = { erro?: string; ok?: string } | undefined

const Talento = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do talento'),
  analista_fixa_id: z.string(),
  redes: z.string().trim().max(200),
})

type Supabase = NonNullable<Awaited<ReturnType<typeof getSessao>>>['supabase']

// ---------- Foto do talento (bucket "talentos") ----------
// A imagem chega já recortada e reduzida no navegador (256×256).

const TIPOS_FOTO = ['image/webp', 'image/jpeg', 'image/png']

/** Foto enviada no formulário: null se não veio; erro se veio inválida. */
function fotoDoFormulario(form: FormData): { foto: File | null; erro?: string } {
  const foto = form.get('foto')
  if (!(foto instanceof File) || foto.size === 0) return { foto: null }
  if (foto.size > 1024 * 1024) return { foto: null, erro: 'A foto ficou grande demais. Tente outra.' }
  if (!TIPOS_FOTO.includes(foto.type)) return { foto: null, erro: 'Use uma foto em JPG, PNG ou WebP.' }
  return { foto }
}

/** Envia a foto, grava no talento e apaga a anterior. Devolve true se deu certo. */
async function gravarFotoTalento(sb: Supabase, talentoId: string, foto: File, anterior: string | null) {
  // nome aleatório: a URL pública não é adivinhável e o navegador não mostra a foto antiga do cache
  const caminho = `${talentoId}/${crypto.randomUUID()}.${foto.type === 'image/png' ? 'png' : 'webp'}`
  const up = await sb.storage.from('talentos').upload(caminho, foto, { contentType: foto.type, cacheControl: '31536000' })
  if (up.error) return false
  const { error } = await sb.from('talentos').update({ foto_path: caminho }).eq('id', talentoId)
  if (error) {
    await sb.storage.from('talentos').remove([caminho])
    return false
  }
  if (anterior) await sb.storage.from('talentos').remove([anterior])
  return true
}

export async function cadastrarTalento(_: Estado, form: FormData): Promise<Estado> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const d = Talento.safeParse(Object.fromEntries(form))
  if (!d.success) return { erro: d.error.issues[0]?.message }
  const { foto, erro: erroFoto } = fotoDoFormulario(form)
  if (erroFoto) return { erro: erroFoto }

  const { data, error } = await s.supabase
    .from('talentos')
    .insert({ nome: d.data.nome, analista_fixa_id: d.data.analista_fixa_id || null, redes: d.data.redes || null })
    .select('id')
    .single()
  if (error) return { erro: error.code === '23505' ? 'Já existe um talento com esse nome.' : mensagemErro(error) }

  // a pasta da foto usa o id do talento, então ela vai depois do cadastro
  const fotoOk = foto ? await gravarFotoTalento(s.supabase, data.id, foto, null) : true
  revalidarTalentos()
  return {
    ok: fotoOk ? `Talento ${d.data.nome} cadastrado.` : `Talento ${d.data.nome} cadastrado, mas a foto não foi salva. Tente de novo em Editar.`,
  }
}

function revalidarTalentos() {
  // a carteira, o cadastro de job e a matriz mostram nomes de talentos
  revalidatePath('/', 'layout')
}

const EdicaoTalento = Talento.extend({ id: z.uuid() })

export async function editarTalento(_: Estado, form: FormData): Promise<Estado> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const d = EdicaoTalento.safeParse(Object.fromEntries(form))
  if (!d.success) return { erro: d.error.issues[0]?.message }
  const { foto, erro: erroFoto } = fotoDoFormulario(form)
  if (erroFoto) return { erro: erroFoto }

  const { data, error } = await s.supabase
    .from('talentos')
    .update({ nome: d.data.nome, analista_fixa_id: d.data.analista_fixa_id || null, redes: d.data.redes || null })
    .eq('id', d.data.id)
    // o update devolve a linha nova; foto_path ainda é a anterior (só muda abaixo)
    .select('id, foto_path')
  if (error) return { erro: error.code === '23505' ? 'Já existe um talento com esse nome.' : mensagemErro(error) }
  if (!data?.length) return { erro: 'Seu perfil não pode editar talentos.' }
  const anterior = data[0].foto_path as string | null

  let fotoOk = true
  if (foto) {
    fotoOk = await gravarFotoTalento(s.supabase, d.data.id, foto, anterior)
  } else if (form.get('remover_foto') === '1' && anterior) {
    const r = await s.supabase.from('talentos').update({ foto_path: null }).eq('id', d.data.id)
    if (r.error) fotoOk = false
    else await s.supabase.storage.from('talentos').remove([anterior])
  }
  revalidarTalentos()
  return { ok: fotoOk ? `Talento ${d.data.nome} atualizado.` : `Talento ${d.data.nome} atualizado, mas a foto não foi alterada. Tente de novo.` }
}

/** Desativar tira o talento da carteira e do cadastro de jobs; jobs antigos e histórico ficam intactos. */
export async function alterarAtivoTalento(entrada: { id: string; ativo: boolean }): Promise<{ erro?: string }> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const id = z.uuid().safeParse(entrada.id)
  if (!id.success) return { erro: 'Talento inválido.' }
  const { data, error } = await s.supabase.from('talentos').update({ ativo: entrada.ativo }).eq('id', id.data).select('id')
  if (error) return { erro: mensagemErro(error) }
  if (!data?.length) return { erro: 'Seu perfil não pode alterar talentos.' }
  revalidarTalentos()
  return {}
}

/** Só para cadastros feitos por engano: talento que nunca entrou em um job. */
export async function excluirTalento(entrada: { id: string }): Promise<{ erro?: string }> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const id = z.uuid().safeParse(entrada.id)
  if (!id.success) return { erro: 'Talento inválido.' }

  const { count } = await s.supabase.from('job_talentos').select('job_id', { count: 'exact', head: true }).eq('talento_id', id.data)
  if (count) return { erro: 'Este talento já participou de jobs. Desative em vez de excluir.' }

  const { data, error } = await s.supabase.from('talentos').delete().eq('id', id.data).select('id, foto_path')
  // 23503: o banco recusou porque algo ainda aponta para o talento (ex.: job criado agora há pouco)
  if (error) return { erro: error.code === '23503' ? 'Este talento já participou de jobs. Desative em vez de excluir.' : mensagemErro(error) }
  if (!data?.length) return { erro: 'Seu perfil não pode excluir talentos.' }
  // não deixa a foto sobrando no armazenamento
  if (data[0].foto_path) await s.supabase.storage.from('talentos').remove([data[0].foto_path as string])
  revalidarTalentos()
  return {}
}

// ---------- Marcas ----------

const NomeMarca = z.string().trim().min(2, 'Informe o nome da marca').max(120)

/** Já existe outra marca com o mesmo nome, ignorando maiúsculas? (o índice único do banco só pega a grafia exata) */
async function marcaRepetida(sb: NonNullable<Awaited<ReturnType<typeof getSessao>>>['supabase'], nome: string, ignorarId?: string) {
  const padrao = nome.replace(/[\\%_]/g, (c) => `\\${c}`)
  let q = sb.from('marcas').select('id').ilike('nome', padrao).limit(1)
  if (ignorarId) q = q.neq('id', ignorarId)
  const { data } = await q
  return Boolean(data?.length)
}

export async function cadastrarMarca(_: Estado, form: FormData): Promise<Estado> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const nome = NomeMarca.safeParse(form.get('nome'))
  if (!nome.success) return { erro: nome.error.issues[0]?.message }
  if (await marcaRepetida(s.supabase, nome.data)) return { erro: 'Já existe uma marca com esse nome.' }
  const { error } = await s.supabase.from('marcas').insert({ nome: nome.data })
  if (error) return { erro: error.code === '23505' ? 'Já existe uma marca com esse nome.' : mensagemErro(error) }
  revalidatePath('/', 'layout')
  return { ok: `Marca ${nome.data} cadastrada.` }
}

export async function editarMarca(_: Estado, form: FormData): Promise<Estado> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const id = z.uuid().safeParse(form.get('id'))
  const nome = NomeMarca.safeParse(form.get('nome'))
  if (!id.success) return { erro: 'Marca inválida.' }
  if (!nome.success) return { erro: nome.error.issues[0]?.message }
  if (await marcaRepetida(s.supabase, nome.data, id.data)) return { erro: 'Já existe uma marca com esse nome.' }
  const { data, error } = await s.supabase.from('marcas').update({ nome: nome.data }).eq('id', id.data).select('id')
  if (error) return { erro: error.code === '23505' ? 'Já existe uma marca com esse nome.' : mensagemErro(error) }
  if (!data?.length) return { erro: 'Seu perfil não pode editar marcas.' }
  // o nome da marca aparece na matriz, na carteira, na agenda e nos alertas
  revalidatePath('/', 'layout')
  return { ok: `Marca renomeada para ${nome.data}.` }
}

export type JobDaMarca = { id: string; codigo: string; talentos: string; vigencia_inicio: string; vigencia_fim: string }

/** Jobs de uma marca, carregados só quando a janela "jobs da marca" abre. */
export async function listarJobsDaMarca(entrada: { id: string }): Promise<{ jobs?: JobDaMarca[]; erro?: string }> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const id = z.uuid().safeParse(entrada.id)
  if (!id.success) return { erro: 'Marca inválida.' }
  const { data, error } = await s.supabase
    .from('jobs')
    .select('id, codigo, vigencia_inicio, vigencia_fim, job_talentos(talento:talentos(nome))')
    .eq('marca_id', id.data)
    .order('vigencia_fim', { ascending: false })
  if (error) return { erro: mensagemErro(error) }
  type Linha = { id: string; codigo: string; vigencia_inicio: string; vigencia_fim: string; job_talentos: { talento: { nome: string } }[] }
  return {
    jobs: (data as unknown as Linha[]).map(({ job_talentos, ...j }) => ({ ...j, talentos: job_talentos.map((t) => t.talento.nome).join(' + ') })),
  }
}

/** Só marcas sem nenhum job (cadastro por engano ou duplicado). */
export async function excluirMarca(entrada: { id: string }): Promise<{ erro?: string }> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const id = z.uuid().safeParse(entrada.id)
  if (!id.success) return { erro: 'Marca inválida.' }

  const { count } = await s.supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('marca_id', id.data)
  if (count) return { erro: 'Esta marca tem jobs e não pode ser excluída.' }

  const { data, error } = await s.supabase.from('marcas').delete().eq('id', id.data).select('id')
  if (error) return { erro: error.code === '23503' ? 'Esta marca tem jobs e não pode ser excluída.' : mensagemErro(error) }
  if (!data?.length) return { erro: 'Seu perfil não pode excluir marcas.' }
  revalidatePath('/', 'layout')
  return {}
}

const Meta = z.object({
  analista_id: z.uuid('Escolha a analista'),
  ano: z.coerce.number().int().min(2020).max(2100),
  valor: z
    .string()
    .trim()
    .min(1, 'Informe a meta')
    .transform((v) => Number(v.replace(/\./g, '').replace(',', '.')))
    .pipe(z.number({ error: 'Meta inválida' }).nonnegative('Meta inválida')),
})

export async function salvarMeta(_: Estado, form: FormData): Promise<Estado> {
  const s = await getSessao()
  if (!s) return { erro: 'Sua sessão expirou.' }
  const d = Meta.safeParse(Object.fromEntries(form))
  if (!d.success) return { erro: d.error.issues[0]?.message }
  const { error } = await s.supabase.from('metas').upsert(d.data)
  if (error) return { erro: mensagemErro(error) }
  revalidatePath('/cadastros')
  revalidatePath('/metas')
  return { ok: 'Meta salva.' }
}
