import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import '@fontsource-variable/geist'
import { Toaster } from '@/components/toaster'
import { COOKIE_MENU, lerMenuRecolhido } from '@/lib/menu'
import { atributoTema, COOKIE_TEMA, lerTema } from '@/lib/tema'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'YZI Jobs', template: '%s · YZI Jobs' },
  description: 'Gestão de jobs da YZI',
  robots: { index: false, follow: false },
}

const FUNDO = { claro: '#f7f7f8', escuro: '#0f0f12' } as const

// a cor da barra do navegador acompanha o tema escolhido; em "Sistema", segue o sistema
export async function generateViewport(): Promise<Viewport> {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value)
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor:
      tema === 'sistema'
        ? [
            { media: '(prefers-color-scheme: light)', color: FUNDO.claro },
            { media: '(prefers-color-scheme: dark)', color: FUNDO.escuro },
          ]
        : FUNDO[tema],
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const tema = lerTema(cookieStore.get(COOKIE_TEMA)?.value)
  const menuRecolhido = lerMenuRecolhido(cookieStore.get(COOKIE_MENU)?.value)
  return (
    // suppressHydrationWarning: extensões do navegador (ColorZilla, Grammarly, gerenciadores de senha)
    // põem atributos no <html>/<body> antes do React carregar. Vale só para os atributos destas
    // duas tags; diferenças no conteúdo das páginas continuam aparecendo.
    <html lang="pt-BR" data-theme={atributoTema(tema)} data-menu={menuRecolhido ? 'recolhido' : undefined} suppressHydrationWarning>
      <body className="min-h-dvh text-[14px] leading-normal antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
