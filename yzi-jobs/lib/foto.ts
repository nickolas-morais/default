const publico = (bucket: string, path: string | null | undefined) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` : null

/** URL pública da foto de perfil (bucket "avatares"); null quando a pessoa não tem foto. */
export function urlFoto(path: string | null | undefined) {
  return publico('avatares', path)
}

/** URL pública da foto do talento (bucket "talentos"); null quando não tem foto. */
export function urlFotoTalento(path: string | null | undefined) {
  return publico('talentos', path)
}
