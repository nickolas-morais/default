import { z } from 'zod'

/** Valor em reais vindo do InputMoeda: "85.000,00" (também aceita "85000"). */
export const dinheiro = z
  .string()
  .trim()
  .min(1, 'Informe o valor')
  .transform((v) => Number(v.replace(/\./g, '').replace(',', '.')))
  .pipe(z.number({ error: 'Valor inválido' }).nonnegative('Valor inválido'))

export const dataISO = z.iso.date({ error: 'Data inválida' })

/** Primeira mensagem de erro de cada campo, para mostrar junto do campo. */
export function errosPorCampo(issues: { path: PropertyKey[]; message: string }[]) {
  const campos: Record<string, string> = {}
  for (const issue of issues) campos[String(issue.path[0] ?? 'geral')] ??= issue.message
  return campos
}
