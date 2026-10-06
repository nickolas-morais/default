'use client'

import { useRef, useTransition } from 'react'
import { CameraIcon, TrashIcon } from '@phosphor-icons/react'
import { removerFoto, trocarFoto } from '@/app/(app)/perfil/actions'
import { toast } from '@/components/toaster'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/esqueleto'
import { MAX_ORIGINAL, prepararFoto } from '@/lib/imagem'

export function FotoPerfil({ nome, foto }: { nome: string; foto: string | null }) {
  const campo = useRef<HTMLInputElement>(null)
  const [pendente, startTransition] = useTransition()

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/')) return void toast.error('Escolha um arquivo de imagem.')
    if (arquivo.size > MAX_ORIGINAL) return void toast.error('A imagem passa de 20 MB. Escolha uma menor.')

    startTransition(async () => {
      let pronta: File
      try {
        pronta = await prepararFoto(arquivo)
      } catch {
        // ex.: HEIC do iPhone fora do Safari
        toast.error('Não foi possível ler esta imagem.', { description: 'Use uma foto em JPG ou PNG.' })
        return
      }
      const form = new FormData()
      form.append('foto', pronta)
      const r = await trocarFoto(form)
      if (r.erro) toast.error('A foto não foi trocada', { description: r.erro })
      else toast.success('Foto atualizada')
    })
  }

  function remover() {
    startTransition(async () => {
      const r = await removerFoto()
      if (r.erro) toast.error('A foto não foi removida', { description: r.erro })
      else toast.success('Foto removida')
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <Avatar nome={nome} foto={foto} tamanho="xl" />
        {pendente ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-surface/70 text-accent">
            <Spinner tamanho={20} />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variante="secundario" tamanho="sm" disabled={pendente} onClick={() => campo.current?.click()}>
            <CameraIcon aria-hidden="true" size={15} />
            {foto ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {foto ? (
            <Button type="button" variante="fantasma" tamanho="sm" disabled={pendente} onClick={remover}>
              <TrashIcon aria-hidden="true" size={15} />
              Remover
            </Button>
          ) : null}
        </div>
        <p className="text-[12.5px] text-muted">JPG ou PNG. A foto é recortada em quadrado, a partir do centro.</p>
        <input ref={campo} type="file" accept="image/jpeg,image/png,image/webp" onChange={escolher} className="sr-only" tabIndex={-1} aria-hidden="true" />
      </div>
    </div>
  )
}
