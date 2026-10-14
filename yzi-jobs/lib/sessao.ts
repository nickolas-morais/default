import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/perfis'

export type Usuario = { id: string; nome: string; email: string; perfil: Perfil; foto: string | null }

/** Uma consulta por requisição, mesmo chamada em vários componentes. */
export const getSessao = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, perfil, ativo, foto_path')
    .eq('id', user.id)
    .maybeSingle()
  // Erro do banco (ex.: migração faltando) não é "sem cadastro": mostra o erro em vez de
  // mandar para o login, senão parece logout e a pessoa entra num vai e volta com a tela de login.
  if (error) {
    console.error('getSessao: falha ao ler o cadastro', error)
    throw new Error(`Não foi possível ler o cadastro do usuário (${error.code}: ${error.message})`)
  }
  if (!data?.ativo) return null

  const usuario: Usuario = { id: data.id, nome: data.nome, email: data.email, perfil: data.perfil, foto: data.foto_path }
  return { supabase, usuario }
})

export async function exigirSessao() {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  return sessao
}

/** Traduz erros do Postgres (RLS e triggers) para mensagens de tela. */
export function mensagemErro(erro: { code?: string; message: string } | null): string {
  if (!erro) return 'Algo deu errado. Tente de novo.'
  if (erro.code === '42501' && !erro.message.startsWith('new row')) return erro.message
  if (erro.code === '42501') return 'Seu perfil não tem permissão para esta alteração.'
  if (erro.code === '22023' || erro.code === 'P0001') return erro.message
  if (erro.code === '23505') return 'Já existe um registro com esses dados.'
  return 'Não foi possível salvar. Tente de novo ou fale com a diretoria.'
}
