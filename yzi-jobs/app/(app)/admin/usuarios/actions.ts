'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PERFIS } from '@/lib/perfis'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessao, mensagemErro } from '@/lib/sessao'

export type Estado = { erro?: string; ok?: string } | undefined
type Sessao = NonNullable<Awaited<ReturnType<typeof getSessao>>>

const Convite = z.object({
  nome: z.string().trim().min(2, 'Informe o nome'),
  email: z.email('E-mail inválido'),
  perfil: z.enum(PERFIS),
})

async function exigirDiretoria() {
  const s = await getSessao()
  return s?.usuario.perfil === 'diretoria_executiva' ? s : null
}

const linkConvite = () => `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-senha`

/** Tirar a diretoria executiva de `id` deixaria o sistema sem ninguém para gerenciar usuários? */
async function ehUltimaDiretoria(s: Sessao, id: string) {
  const { count } = await s.supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('perfil', 'diretoria_executiva')
    .eq('ativo', true)
    .neq('id', id)
  return !count
}

export async function convidarUsuario(_: Estado, form: FormData): Promise<Estado> {
  // a service role só é usada depois de confirmar que quem pede é a diretoria
  const s = await exigirDiretoria()
  if (!s) return { erro: 'Somente a diretoria executiva convida usuários.' }
  const d = Convite.safeParse(Object.fromEntries(form))
  if (!d.success) return { erro: d.error.issues[0]?.message }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(d.data.email, { redirectTo: linkConvite() })
  if (error || !data.user) {
    return { erro: error?.message.includes('already') ? 'Este e-mail já tem cadastro.' : 'Não foi possível enviar o convite.' }
  }

  const { error: e2 } = await admin.from('profiles').insert({ id: data.user.id, nome: d.data.nome, email: d.data.email, perfil: d.data.perfil })
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id)
    return { erro: mensagemErro(e2) }
  }
  // feito pela service role: o trigger não vê quem pediu, então o registro sai daqui
  await admin.from('historico_equipe').insert({
    alvo_id: data.user.id,
    alvo_nome: d.data.nome,
    autor_id: s.usuario.id,
    campo: 'convite',
    valor_novo: d.data.perfil,
  })
  revalidatePath('/admin/usuarios')
  return { ok: `Convite enviado para ${d.data.email}.` }
}

const Editar = z.object({
  id: z.uuid(),
  nome: z.string().trim().min(2, 'Informe o nome'),
  email: z.email('E-mail inválido').transform((e) => e.trim().toLowerCase()),
  perfil: z.enum(PERFIS),
})

export async function editarUsuario(_: Estado, form: FormData): Promise<Estado> {
  const s = await exigirDiretoria()
  if (!s) return { erro: 'Somente a diretoria executiva edita usuários.' }
  const d = Editar.safeParse(Object.fromEntries(form))
  if (!d.success) return { erro: d.error.issues[0]?.message }
  const { id, nome, email, perfil } = d.data

  const { data: atual, error: e0 } = await s.supabase.from('profiles').select('email, perfil, ativo').eq('id', id).maybeSingle()
  if (e0 || !atual) return { erro: 'Usuário não encontrado.' }
  const trocaPerfil = atual.perfil !== perfil
  if (trocaPerfil && id === s.usuario.id) return { erro: 'Você não pode alterar o próprio perfil.' }
  if (trocaPerfil && atual.perfil === 'diretoria_executiva' && atual.ativo && (await ehUltimaDiretoria(s, id))) {
    return { erro: 'É a única diretoria executiva ativa. Dê esse perfil a outra pessoa antes.' }
  }
  const trocaEmail = atual.email.toLowerCase() !== email

  // O e-mail é o login: muda primeiro no Auth (service role, já confirmado pela diretoria)
  // e depois no cadastro. Se o cadastro falhar, o Auth volta ao e-mail anterior.
  const admin = createAdminClient()
  if (trocaEmail) {
    const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
    if (error) {
      return { erro: /already|registered|exists/i.test(error.message) ? 'Este e-mail já é usado por outra pessoa.' : 'Não foi possível trocar o e-mail.' }
    }
  }

  // cliente do usuário: o RLS de profiles também exige diretoria
  const { error } = await s.supabase.from('profiles').update({ nome, email, perfil }).eq('id', id)
  if (error) {
    if (trocaEmail) await admin.auth.admin.updateUserById(id, { email: atual.email, email_confirm: true })
    return { erro: mensagemErro(error) }
  }
  revalidatePath('/', 'layout')
  return { ok: trocaEmail ? `Dados salvos. O login agora é ${email}.` : 'Dados salvos.' }
}

/** Desativar: a pessoa perde o acesso na hora; jobs, histórico e metas dela continuam. */
export async function alterarAcesso(entrada: { id: string; ativo: boolean }): Promise<{ erro?: string }> {
  const s = await exigirDiretoria()
  if (!s) return { erro: 'Somente a diretoria executiva altera acessos.' }
  const id = z.uuid().safeParse(entrada.id)
  if (!id.success) return { erro: 'Usuário inválido.' }
  if (!entrada.ativo) {
    if (id.data === s.usuario.id) return { erro: 'Você não pode desativar o próprio acesso.' }
    const { data: alvo } = await s.supabase.from('profiles').select('perfil').eq('id', id.data).maybeSingle()
    if (alvo?.perfil === 'diretoria_executiva' && (await ehUltimaDiretoria(s, id.data))) {
      return { erro: 'É a única diretoria executiva ativa. Dê esse perfil a outra pessoa antes.' }
    }
  }
  const { error } = await s.supabase.from('profiles').update({ ativo: entrada.ativo }).eq('id', id.data)
  if (error) return { erro: mensagemErro(error) }
  revalidatePath('/', 'layout')
  return {}
}

/** Convite ainda não aceito: manda o e-mail de novo. */
export async function reenviarConvite(entrada: { id: string }): Promise<{ erro?: string }> {
  const s = await exigirDiretoria()
  if (!s) return { erro: 'Somente a diretoria executiva reenvia convites.' }
  const id = z.uuid().safeParse(entrada.id)
  if (!id.success) return { erro: 'Usuário inválido.' }
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(id.data)
  if (!data.user?.email) return { erro: 'Usuário não encontrado.' }
  if (data.user.last_sign_in_at) return { erro: 'Esta pessoa já entrou no sistema. Ela pode usar "Esqueci minha senha".' }
  const { error } = await admin.auth.admin.inviteUserByEmail(data.user.email, { redirectTo: linkConvite() })
  if (error) return { erro: 'Não foi possível reenviar o convite. Tente de novo em alguns minutos.' }
  return {}
}

/**
 * Só para convite nunca aceito (ex.: e-mail errado): quem já entrou pode ter jobs,
 * histórico e metas. Para essa pessoa, o caminho é desativar.
 */
export async function excluirUsuario(entrada: { id: string }): Promise<{ erro?: string }> {
  const s = await exigirDiretoria()
  if (!s) return { erro: 'Somente a diretoria executiva exclui usuários.' }
  const id = z.uuid().safeParse(entrada.id)
  if (!id.success) return { erro: 'Usuário inválido.' }
  if (id.data === s.usuario.id) return { erro: 'Você não pode excluir o próprio usuário.' }

  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(id.data)
  if (!data.user) return { erro: 'Usuário não encontrado.' }
  if (data.user.last_sign_in_at) return { erro: 'Esta pessoa já entrou no sistema. Desative em vez de excluir.' }

  const { data: alvo } = await admin.from('profiles').select('nome, email').eq('id', id.data).maybeSingle()
  // apagar o usuário do Auth apaga o profile junto (on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(id.data)
  if (error) return { erro: 'Não foi possível excluir. Desative em vez de excluir.' }
  await admin.from('historico_equipe').insert({
    alvo_nome: alvo?.nome ?? data.user.email ?? 'Convite excluído',
    autor_id: s.usuario.id,
    campo: 'convite_excluido',
    valor_anterior: alvo?.email ?? data.user.email ?? null,
  })
  revalidatePath('/admin/usuarios')
  return {}
}
