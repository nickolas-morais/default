'use client'

import { useTransition } from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import { excluirArquivo } from '@/app/(app)/jobs/[id]/actions'
import { toast } from '@/components/toaster'
import { Button } from '@/components/ui/button'
import { Janela, useJanela } from '@/components/ui/janela'

/** Lixeira ao lado do arquivo, com confirmação: o arquivo some do job e do armazenamento. */
export function ExcluirArquivo({ jobId, id, nome }: { jobId: string; id: string; nome: string }) {
  const janela = useJanela()
  const [pendente, startTransition] = useTransition()

  function excluir() {
    startTransition(async () => {
      const r = await excluirArquivo({ jobId, id })
      if (!r.ok) {
        toast.error('Não foi possível excluir o arquivo', { description: r.erro })
        return
      }
      janela.fechar()
      toast.success(`Arquivo "${nome}" excluído`)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={janela.abrir}
        aria-label={`Excluir ${nome}`}
        title="Excluir arquivo"
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-crit-soft hover:text-crit"
      >
        <TrashIcon aria-hidden="true" size={16} />
      </button>
      <Janela janela={janela} titulo="Excluir este arquivo?" descricao={`"${nome}" será apagado do job. Esta ação não pode ser desfeita.`}>
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={janela.fechar}>
            Cancelar
          </Button>
          <Button type="button" variante="perigo" disabled={pendente} onClick={excluir}>
            {pendente ? 'Excluindo…' : 'Excluir arquivo'}
          </Button>
        </div>
      </Janela>
    </>
  )
}
