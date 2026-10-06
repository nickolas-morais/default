import 'server-only'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Limite de tentativas guardado no banco (funciona na Vercel, onde cada requisição pode
 * cair numa instância diferente). Devolve false quando a chave passou do limite na janela.
 *
 * Se o banco não responder, deixa passar (o Supabase Auth ainda tem os próprios limites):
 * melhor do que trancar todo mundo fora por uma falha de infraestrutura.
 */
export async function dentroDoLimite(chave: string, maximo: number, janelaSegundos: number) {
  const { data, error } = await createAdminClient().rpc('registrar_tentativa', {
    p_chave: chave,
    p_max: maximo,
    p_janela_segundos: janelaSegundos,
  })
  if (error) {
    console.error('limite de tentativas indisponível', error.code)
    return true
  }
  return data === true
}

/** IP de quem fez a requisição (a Vercel preenche x-forwarded-for). */
export async function ipDaRequisicao() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'desconhecido'
}
