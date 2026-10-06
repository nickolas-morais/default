'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type EstadoForm = { erro?: string; ok?: string } | undefined

const Login = z.object({ email: z.email(), senha: z.string().min(1), volta: z.string().optional() })

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const dados = Login.safeParse(Object.fromEntries(form))
  if (!dados.success) return { erro: 'Preencha e-mail e senha.' }

  const supabase = await createClient()
  const { data: login, error } = await supabase.auth.signInWithPassword({ email: dados.data.email, password: dados.data.senha })
  if (error) return { erro: 'E-mail ou senha incorretos. Confira e tente de novo.' }

  // Acesso desativado pela diretoria: a senha confere, mas o sistema não deixa entrar.
  // (o RLS de profiles só deixa ler quem está ativo, então desativado volta sem linha)
  const { data: perfil } = await supabase.from('profiles').select('ativo').eq('id', login.user.id).maybeSingle()
  if (!perfil?.ativo) {
    await supabase.auth.signOut()
    return { erro: 'Seu acesso está desativado. Fale com a diretoria executiva.' }
  }

  // só redireciona para caminhos internos
  const volta = dados.data.volta?.startsWith('/') && !dados.data.volta.startsWith('//') ? dados.data.volta : '/'
  redirect(volta)
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function pedirNovaSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = z.email().safeParse(form.get('email'))
  if (!email.success) return { erro: 'Informe um e-mail válido.' }
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-senha`,
  })
  // mesma resposta exista ou não a conta
  return { ok: 'Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.' }
}

const NovaSenha = z
  .object({ senha: z.string().min(10, 'Use pelo menos 10 caracteres.'), confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { message: 'As senhas não conferem.' })

export async function definirSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const dados = NovaSenha.safeParse(Object.fromEntries(form))
  if (!dados.success) return { erro: dados.error.issues[0]?.message }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: dados.data.senha })
  if (error) return { erro: 'O link expirou. Peça um novo em “Esqueci minha senha”.' }
  redirect('/')
}
