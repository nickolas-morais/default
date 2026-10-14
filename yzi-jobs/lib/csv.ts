// CSV que o Excel em português abre direto: ";" como separador, BOM para os acentos,
// vírgula decimal sem separador de milhar (o Excel reconhece como número).

type Celula = string | number | null | undefined

function celula(v: Celula) {
  if (v === null || v === undefined) return ''
  // Injeção de fórmula: um nome cadastrado como "=HYPERLINK(...)" viraria fórmula no Excel.
  // Texto que começa com = + - @ (ou tab/enter) ganha um apóstrofo e fica como texto.
  const texto = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function gerarCsv(cabecalho: string[], linhas: Celula[][]) {
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n')
}

/** Resposta de download (nome com a data do dia, no fuso de São Paulo). */
export function respostaCsv(nomeBase: string, conteudo: string, hoje: string) {
  return new Response(conteudo, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeBase}-${hoje}.csv"`,
      // contém valores: não guardar em cache compartilhado
      'Cache-Control': 'private, no-store',
    },
  })
}
