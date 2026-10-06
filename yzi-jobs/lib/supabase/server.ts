import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { OPCOES_COOKIE } from '@/lib/supabase/cookies'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: OPCOES_COOKIE,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(lista) {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, ...OPCOES_COOKIE }))
        } catch {
          // Chamado de um Server Component: o proxy renova a sessão.
        }
      },
    },
  })
}
