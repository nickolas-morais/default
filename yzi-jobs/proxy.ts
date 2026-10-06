import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLICAS = ['/login', '/auth/confirm', '/esqueci-senha', '/api/cron']

// Renova a sessão do Supabase e manda para /login quem não está autenticado.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  if (!user && !PUBLICAS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = pathname === '/' ? '' : `?volta=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico|woff2?)$).*)'],
}
