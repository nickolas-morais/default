/**
 * Só aceita caminhos dentro do próprio sistema ("/jobs/123"), nunca outro site.
 * Bloqueia "//site.com" e também "/\site.com", que o navegador trata como "//site.com"
 * (open redirect: um link falso levaria a pessoa para uma página de terceiros depois do login).
 */
export function caminhoInterno(valor: string | null | undefined, padrao = '/') {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return padrao
  try {
    const url = new URL(valor, 'https://interno.invalid')
    return url.origin === 'https://interno.invalid' ? `${url.pathname}${url.search}${url.hash}` : padrao
  } catch {
    return padrao
  }
}
