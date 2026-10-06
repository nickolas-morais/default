const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const dataFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
const dataHoraFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
})

export const brl = (n: number | string) => brlFmt.format(Number(n))

/** Datas do banco chegam como 'AAAA-MM-DD'; formatadas em UTC para não mudar de dia. */
export const data = (iso: string | null | undefined) => (iso ? dataFmt.format(new Date(`${iso}T00:00:00Z`)) : '—')

export const dataHora = (iso: string) => dataHoraFmt.format(new Date(iso))

/** Hoje em São Paulo, como 'AAAA-MM-DD'. */
export function hojeSP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function diasAte(iso: string, hoje = hojeSP()): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 864e5)
}

export function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}
