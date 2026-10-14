'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraIcon, TrashIcon } from '@phosphor-icons/react'
import { toast } from '@/components/toaster'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/esqueleto'
import { MAX_ORIGINAL, prepararFoto } from '@/lib/imagem'

/**
 * Foto dentro do formulário de talento: mostra a prévia e só grava ao salvar.
 * A imagem já recortada vai num <input type="file" name="foto"> oculto (via DataTransfer),
 * então segue junto com os outros campos; "remover" vai em remover_foto=1.
 */
export function CampoFotoTalento({ nome, fotoAtual }: { nome: string; fotoAtual: string | null }) {
  const escolha = useRef<HTMLInputElement>(null)
  const envio = useRef<HTMLInputElement>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [remover, setRemover] = useState(false)
  const [preparando, setPreparando] = useState(false)

  // libera a URL temporária da prévia quando ela muda ou o campo some
  useEffect(() => () => (previa ? URL.revokeObjectURL(previa) : undefined), [previa])

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/')) return void toast.error('Escolha um arquivo de imagem.')
    if (arquivo.size > MAX_ORIGINAL) return void toast.error('A imagem passa de 20 MB. Escolha uma menor.')
    setPreparando(true)
    try {
      const pronta = await prepararFoto(arquivo)
      const dt = new DataTransfer()
      dt.items.add(pronta)
      if (envio.current) envio.current.files = dt.files
      setPrevia(URL.createObjectURL(pronta))
      setRemover(false)
    } catch {
      // ex.: HEIC do iPhone fora do Safari
      toast.error('Não foi possível ler esta imagem.', { description: 'Use uma foto em JPG ou PNG.' })
    } finally {
      setPreparando(false)
    }
  }

  function tirar() {
    if (envio.current) envio.current.value = ''
    setPrevia(null)
    setRemover(Boolean(fotoAtual))
  }

  const mostrada = previa ?? (remover ? null : fotoAtual)

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar nome={nome || '?'} foto={mostrada} tamanho="xl" />
        {preparando ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-surface/70 text-accent">
            <Spinner tamanho={20} />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variante="secundario" tamanho="sm" disabled={preparando} onClick={() => escolha.current?.click()}>
            <CameraIcon aria-hidden="true" size={15} />
            {mostrada ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {mostrada ? (
            <Button type="button" variante="fantasma" tamanho="sm" disabled={preparando} onClick={tirar}>
              <TrashIcon aria-hidden="true" size={15} />
              Remover
            </Button>
          ) : null}
        </div>
        <p className="text-[12.5px] text-muted">{previa ? 'A foto nova é salva junto com o talento.' : 'Opcional. JPG ou PNG, recortada em quadrado.'}</p>
      </div>
      {/* escolha do arquivo original (não vai no formulário) */}
      <input ref={escolha} type="file" accept="image/jpeg,image/png,image/webp" onChange={escolher} className="sr-only" tabIndex={-1} aria-hidden="true" />
      {/* foto já recortada que vai no formulário */}
      <input ref={envio} type="file" name="foto" className="sr-only" tabIndex={-1} aria-hidden="true" />
      {remover ? <input type="hidden" name="remover_foto" value="1" /> : null}
    </div>
  )
}
