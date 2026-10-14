// Tema escolhido no seletor. Fica num cookie para o servidor já renderizar
// a página no tema certo, sem piscar. Sem cookie, segue o sistema operacional.
export const TEMAS = ['claro', 'escuro', 'sistema'] as const
export type Tema = (typeof TEMAS)[number]

export const COOKIE_TEMA = 'tema'

export function lerTema(valor: string | undefined): Tema {
  return valor === 'claro' || valor === 'escuro' ? valor : 'sistema'
}

/** Valor do atributo data-theme no <html>; ausente quando segue o sistema. */
export function atributoTema(tema: Tema) {
  return tema === 'claro' ? 'light' : tema === 'escuro' ? 'dark' : undefined
}
