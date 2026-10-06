'use client'

import { useActionState, useRef, useEffect } from 'react'
import { enviarArquivo } from '@/app/(app)/jobs/[id]/actions'
import { toast } from '@/components/toaster'
import { Button } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/field'

export function UploadArquivo({
  jobId,
  talentos,
  tipos,
}: {
  jobId: string
  talentos: { id: string; nome: string }[]
  tipos: { valor: string; rotulo: string }[]
}) {
  const [estado, acao, pendente] = useActionState(enviarArquivo, undefined)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!estado?.ok) return
    form.current?.reset()
    toast.success('Arquivo anexado')
  }, [estado])

  if (!tipos.length) return null

  return (
    <form ref={form} action={acao} className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
      <p className="text-[13px] font-medium">Anexar arquivo</p>
      <input type="hidden" name="jobId" value={jobId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="Tipo" htmlFor="upload_tipo">
          <Select id="upload_tipo" name="tipo" required>
            {tipos.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Select>
        </Field>
        {talentos.length > 0 ? (
          <Field label="Talento" htmlFor="upload_talento" ajuda="Só para NF do talento.">
            <Select id="upload_talento" name="talentoId" defaultValue="">
              <option value="">Nenhum</option>
              {talentos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
      <Field label="Arquivo" htmlFor="upload_arquivo" ajuda="PDF, XML, PNG ou JPG, até 9 MB.">
        <input
          id="upload_arquivo"
          type="file"
          name="arquivo"
          required
          accept=".pdf,.xml,.png,.jpg,.jpeg"
          className="w-full min-w-0 rounded-md border border-dashed border-line-strong p-1.5 text-[13px] text-muted file:mr-3 file:min-h-8 file:cursor-pointer file:rounded-[5px] file:border-0 file:bg-sunken file:px-3 file:text-[13px] file:font-medium file:text-ink hover:file:bg-line"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variante="secundario" disabled={pendente}>
          {pendente ? 'Enviando…' : 'Anexar arquivo'}
        </Button>
        <span aria-live="polite" className="text-[13px] font-medium text-crit">
          {estado && !estado.ok ? estado.erro : ''}
        </span>
      </div>
    </form>
  )
}
