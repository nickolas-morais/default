import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { OPCOES_COOKIE } from '@/lib/supabase/cookies'

const PUBLICAS = ['/login', '/auth/confirm', '/esqueci-senha', '/api/cron']

/**
 * Content Security Policy com nonce: só executam os scripts que o próprio Next.js marca
 * com o nonce desta requisição. Script injetado (XSS) não roda.
 * Imagens: as fotos vêm do Storage do Supabase.
 */
function politicaDeSeguranca(nonce: string) {
  const dev = process.env.NODE_ENV !== 'production'
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? ` 'unsafe-eval'` : ''}`,
    // Tailwind e alguns componentes usam style="" (larguras de barras, posições de menus)
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabase}`,
    `font-src 'self'`,
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    // só com o sistema em HTTPS (em http, como num teste local, quebraria os próprios arquivos)
    ...(process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://') ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

// Renova a sessão do Supabase, manda para /login quem não está autenticado e aplica a CSP.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = politicaDeSeguranca(nonce)
  // o Next.js lê o nonce destes cabeçalhos da requisição e o aplica aos próprios scripts
  const cabecalhos = new Headers(request.headers)
  cabecalhos.set('x-nonce', nonce)
  cabecalhos.set('Content-Security-Policy', csp)

  let response = NextResponse.next({ request: { headers: cabecalhos } })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: OPCOES_COOKIE,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: cabecalhos } })
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, ...OPCOES_COOKIE }))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  if (!user && !PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = pathname === '/' ? '' : `?volta=${encodeURIComponent(pathname)}`
    const redirecionar = NextResponse.redirect(url)
    redirecionar.headers.set('Content-Security-Policy', csp)
    return redirecionar
  }
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico|woff2?)$).*)'],
}
