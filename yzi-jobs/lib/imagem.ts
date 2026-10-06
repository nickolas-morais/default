// Só roda no navegador (canvas). Usado pela foto de perfil e pela foto do talento.

const LADO = 256
/** Foto de celular costuma ter 3 a 8 MB; acima disso provavelmente não é uma foto. */
export const MAX_ORIGINAL = 20 * 1024 * 1024

/** Recorta o centro em quadrado e reduz para 256×256 (WebP; PNG se o navegador não gerar WebP). */
export async function prepararFoto(arquivo: File): Promise<File> {
  const imagem = await createImageBitmap(arquivo)
  const lado = Math.min(imagem.width, imagem.height)
  const canvas = document.createElement('canvas')
  canvas.width = LADO
  canvas.height = LADO
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponível')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imagem, (imagem.width - lado) / 2, (imagem.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  imagem.close()
  const blob = await new Promise<Blob>((resolver, falhar) =>
    canvas.toBlob((b) => (b ? resolver(b) : falhar(new Error('falha ao gerar a imagem'))), 'image/webp', 0.85),
  )
  return new File([blob], blob.type === 'image/webp' ? 'foto.webp' : 'foto.png', { type: blob.type })
}
