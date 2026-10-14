import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { caminhoInterno } from '@/lib/redirecionamento'
import { createClient } from '@/lib/supabase/server'

// Link dos e-mails de convite e de redefinição de senha.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  // só os links que o sistema envia: convite e redefinição de senha
  const tipo = searchParams.get('type')
  const type: EmailOtpType | null = tipo === 'invite' || tipo === 'recovery' ? tipo : null
  const destino = caminhoInterno(searchParams.get('next'))

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(new URL(destino, origin))
  }
  return NextResponse.redirect(new URL('/login?erro=link', origin))
}
