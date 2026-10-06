import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente com a service role: IGNORA o RLS.
 * Uso restrito, sempre depois de conferir a permissão de quem pede: rota de cron, gestão de usuários
 * (convite, e-mail, exclusão) e remoção do arquivo no Storage depois que o RLS liberou apagar o registro.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
