// Menu lateral recolhido (só ícones). Fica num cookie para o servidor já
// renderizar a largura certa, sem piscar. Só vale para telas a partir de md.
export const COOKIE_MENU = 'menu'

export function lerMenuRecolhido(valor: string | undefined) {
  return valor === 'recolhido'
}
