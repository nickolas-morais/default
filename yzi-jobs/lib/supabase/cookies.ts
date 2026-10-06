/**
 * Opções dos cookies de sessão do Supabase.
 * httpOnly: o sistema só fala com o Supabase pelo servidor, então o navegador não precisa
 * ler o token; um script injetado na página não consegue roubar a sessão.
 * secure: só via HTTPS em produção (em localhost o navegador recusaria).
 */
export const OPCOES_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}
