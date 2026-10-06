'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { EstadoForm } from '@/app/(auth)/login/actions'
import { getSessao } from '@/lib/sessao'

const TrocaSenha = z
  .object({
    atual: z.string().min(1, 'Informe a senha atual.'),
    senha: z.string().min(10, 'A nova senha precisa ter pelo menos 10 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: 'As senhas novas não conferem.' })
  .refine((d) => d.senha !== d.atual, { message: 'A nova senha precisa ser diferente da atual.' })

export async function trocarSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await getSessao()
  if (!sessao) return { erro: 'Sua sessão expirou. Entre de novo.' }

  const dados = TrocaSenha.safeParse(Object.fromEntries(form))
  if (!dados.success) return { erro: dados.error.issues[0]?.message }

  // Confirma a senha atual antes de trocar: um computador destravado não basta para mudar a senha.
  const { supabase, usuario } = sessao
  const conferencia = await supabase.auth.signInWithPassword({ email: usuario.email, password: dados.data.atual })
  if (conferencia.error) return { erro: 'A senha atual está incorreta.' }

  const { error } = await supabase.auth.updateUser({ password: dados.data.senha })
  if (error) return { erro: 'Não foi possível trocar a senha. Tente de novo.' }
  return { ok: 'Senha alterada.' }
}

// ---------- Foto de perfil ----------
// A imagem chega já recortada e reduzida no navegador (256×256, WebP).

const TAMANHO_FOTO = 1024 * 1024

export async function trocarFoto(form: FormData): Promise<{ erro?: string }> {
  const sessao = await getSessao()
  if (!sessao) return { erro: 'Sua sessão expirou. Entre de novo.' }
  const foto = form.get('foto')
  if (!(foto instanceof File) || foto.size === 0) return { erro: 'Escolha uma imagem.' }
  if (foto.size > TAMANHO_FOTO) return { erro: 'A imagem ficou grande demais. Tente outra.' }
  if (!['image/webp', 'image/jpeg', 'image/png'].includes(foto.type)) return { erro: 'Use uma imagem JPG, PNG ou WebP.' }

  const { supabase, usuario } = sessao
  // nome aleatório: a URL pública não é adivinhável e o navegador não mostra a foto antiga do cache
  const caminho = `${usuario.id}/${crypto.randomUUID()}.webp`
  const up = await supabase.storage.from('avatares').upload(caminho, foto, { contentType: foto.type, cacheControl: '31536000' })
  if (up.error) return { erro: 'Não foi possível enviar a foto. Tente de novo.' }

  const { error } = await supabase.rpc('definir_minha_foto', { p_path: caminho })
  if (error) {
    await supabase.storage.from('avatares').remove([caminho])
    return { erro: 'Não foi possível salvar a foto. Tente de novo.' }
  }
  if (usuario.foto) await supabase.storage.from('avatares').remove([usuario.foto])
  // a foto aparece no menu, na equipe, no histórico e nas metas
  revalidatePath('/', 'layout')
  return {}
}

export async function removerFoto(): Promise<{ erro?: string }> {
  const sessao = await getSessao()
  if (!sessao) return { erro: 'Sua sessão expirou. Entre de novo.' }
  const { supabase, usuario } = sessao
  const { error } = await supabase.rpc('definir_minha_foto', { p_path: null })
  if (error) return { erro: 'Não foi possível remover a foto. Tente de novo.' }
  if (usuario.foto) await supabase.storage.from('avatares').remove([usuario.foto])
  revalidatePath('/', 'layout')
  return {}
}
