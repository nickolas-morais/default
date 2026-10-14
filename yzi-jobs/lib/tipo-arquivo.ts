import 'server-only'

/**
 * Confere o tipo real do arquivo pelos primeiros bytes ("assinatura"), em vez de confiar
 * no tipo informado pelo navegador, que pode ser alterado (ex.: um HTML enviado como PDF).
 */
export type TipoReal = 'pdf' | 'png' | 'jpeg' | 'webp' | 'xml'

export async function tipoReal(arquivo: File): Promise<TipoReal | null> {
  const b = new Uint8Array(await arquivo.slice(0, 64).arrayBuffer())
  const comeca = (...bytes: number[]) => bytes.every((v, i) => b[i] === v)
  if (comeca(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'pdf' // %PDF-
  if (comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png'
  if (comeca(0xff, 0xd8, 0xff)) return 'jpeg'
  if (comeca(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp' // RIFF....WEBP
  // XML (NF-e): texto que começa com "<" (pode ter BOM e espaços antes)
  const texto = new TextDecoder().decode(b).replace(/^﻿/, '').trimStart()
  if (texto.startsWith('<?xml') || /^<[A-Za-z]/.test(texto)) return 'xml'
  return null
}

/** Tipo de conteúdo (MIME) gravado no Storage, sempre a partir do tipo real. */
export const MIME: Record<TipoReal, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  xml: 'application/xml',
}
