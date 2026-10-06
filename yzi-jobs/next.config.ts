import type { NextConfig } from 'next'

// Cabeçalhos de segurança em todas as respostas. A Content-Security-Policy fica no proxy.ts,
// porque usa um nonce novo a cada requisição.
const CABECALHOS_SEGURANCA = [
  // só HTTPS por 2 anos, inclusive subdomínios
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // o navegador não "adivinha" o tipo de arquivo (um upload disfarçado não vira HTML executável)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // ninguém abre o sistema dentro de outro site (clickjacking); a CSP também cobre com frame-ancestors
  { key: 'X-Frame-Options', value: 'DENY' },
  // links para fora não levam o endereço interno (com ids de jobs) junto
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // recursos do aparelho que o sistema não usa ficam bloqueados
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
]

const nextConfig: NextConfig = {
  // não anuncia "X-Powered-By: Next.js"
  poweredByHeader: false,
  experimental: {
    // contratos e NFs em PDF podem passar de 1 MB
    serverActions: { bodySizeLimit: '10mb' },
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  async headers() {
    return [{ source: '/:path*', headers: CABECALHOS_SEGURANCA }]
  },
}

export default nextConfig
