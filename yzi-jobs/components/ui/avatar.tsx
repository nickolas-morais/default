export function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const PIXELS = { sm: 28, md: 36, lg: 44, xl: 64 } as const

const TAMANHO = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-[12.5px]',
  lg: 'size-11 text-[14px]',
  xl: 'size-16 text-[18px]',
} as const

/** Foto da pessoa (URL de urlFoto) ou, sem foto, as iniciais. Decorativo: o nome sempre aparece ao lado. */
export function Avatar({ nome, foto, tamanho = 'md' }: { nome: string; foto?: string | null; tamanho?: keyof typeof TAMANHO }) {
  if (foto) {
    return (
      // <img> simples: o arquivo já chega reduzido a 256px, next/image não acrescenta nada aqui
      <img src={foto} alt="" aria-hidden="true" width={PIXELS[tamanho]} height={PIXELS[tamanho]} loading="lazy" decoding="async" className={`shrink-0 rounded-full object-cover ring-1 ring-inset ring-line ${TAMANHO[tamanho]}`} />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-sunken font-semibold text-muted ring-1 ring-inset ring-line ${TAMANHO[tamanho]}`}
    >
      {iniciais(nome)}
    </span>
  )
}
