'use client'

import { useActionState, useEffect, useTransition } from 'react'
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { excluirEntrega, salvarEntrega } from '@/app/(app)/jobs/[id]/actions'
import { toast, useToastDeSucesso } from '@/components/toaster'
import { Button } from '@/components/ui/button'
import { Field, inputClass, Select } from '@/components/ui/field'
import { Janela, useJanela } from '@/components/ui/janela'
import { MenuAcoes } from '@/components/ui/menu-acoes'
import { ENT_PUBLICADO, REDES } from '@/lib/status'

type Talento = { id: string; nome: string }
export type EntregaEditavel = { id: string; descricao: string; rede: string; data_prevista: string; status: number; talento: { id: string } }

/** "Adicionar entrega" no cabeçalho da seção Entregáveis. */
export function NovaEntrega({ jobId, talentos }: { jobId: string; talentos: Talento[] }) {
  const janela = useJanela()
  return (
    <>
      <Button type="button" variante="secundario" tamanho="sm" onClick={janela.abrir}>
        <PlusIcon aria-hidden="true" size={14} weight="bold" />
        Adicionar entrega
      </Button>
      <Janela janela={janela} titulo="Adicionar entrega" descricao="A entrega entra na agenda e na matriz de status.">
        <FormEntrega jobId={jobId} talentos={talentos} fechar={janela.fechar} />
      </Janela>
    </>
  )
}

/** Menu "⋯" de cada entrega: Editar e Excluir (a publicada não pode ser excluída). */
export function MenuEntrega({
  jobId,
  entrega: e,
  talentos,
  podeExcluir,
}: {
  jobId: string
  entrega: EntregaEditavel
  talentos: Talento[]
  podeExcluir: boolean
}) {
  const edicao = useJanela()
  const exclusao = useJanela()
  const [pendente, startTransition] = useTransition()
  const publicada = e.status === ENT_PUBLICADO

  function excluir() {
    startTransition(async () => {
      const r = await excluirEntrega({ jobId, id: e.id })
      if (!r.ok) {
        toast.error('Não foi possível excluir a entrega', { description: r.erro })
        return
      }
      exclusao.fechar()
      toast.success(`Entrega "${e.descricao}" excluída`)
    })
  }

  return (
    <>
      <MenuAcoes
        rotulo={`Ações da entrega ${e.descricao}`}
        acoes={[
          { rotulo: 'Editar', icone: PencilSimpleIcon, aoClicar: edicao.abrir },
          ...(podeExcluir
            ? [
                {
                  rotulo: 'Excluir',
                  icone: TrashIcon,
                  aoClicar: exclusao.abrir,
                  perigo: true,
                  desabilitada: pendente,
                  motivo: publicada ? 'Entrega publicada não pode ser excluída.' : undefined,
                },
              ]
            : []),
        ]}
      />
      <Janela janela={edicao} titulo="Editar entrega">
        <FormEntrega jobId={jobId} talentos={talentos} entrega={e} fechar={edicao.fechar} />
      </Janela>
      <Janela janela={exclusao} titulo={`Excluir "${e.descricao}"?`} descricao="A entrega sai da agenda e da matriz. Fica registrado no histórico do job.">
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={exclusao.fechar}>
            Cancelar
          </Button>
          <Button type="button" variante="perigo" disabled={pendente} onClick={excluir}>
            {pendente ? 'Excluindo…' : 'Excluir entrega'}
          </Button>
        </div>
      </Janela>
    </>
  )
}

function FormEntrega({ jobId, talentos, entrega: e, fechar }: { jobId: string; talentos: Talento[]; entrega?: EntregaEditavel; fechar: () => void }) {
  const [estado, acao, pendente] = useActionState(salvarEntrega, undefined)
  const p = e ? `ent-${e.id}` : 'ent-nova'
  useToastDeSucesso(estado)
  useEffect(() => {
    if (estado?.ok) fechar()
  }, [estado, fechar])

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="jobId" value={jobId} />
      {e ? <input type="hidden" name="id" value={e.id} /> : null}
      <Field label="Entrega" htmlFor={`${p}-descricao`}>
        <input id={`${p}-descricao`} name="descricao" defaultValue={e?.descricao} required autoComplete="off" placeholder="Ex.: Reels 1 de 5…" className={inputClass} />
      </Field>
      {talentos.length === 1 ? (
        <input type="hidden" name="talento_id" value={talentos[0].id} />
      ) : (
        <Field label="Talento" htmlFor={`${p}-talento`}>
          {/* lista curta (só os talentos do job): select nativo */}
          <Select id={`${p}-talento`} name="talento_id" defaultValue={e?.talento.id ?? ''} required>
            <option value="" disabled>
              Escolha
            </option>
            {talentos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Rede" htmlFor={`${p}-rede`}>
          <Select id={`${p}-rede`} name="rede" defaultValue={e?.rede ?? 'Instagram'}>
            {/* rede que não está mais na lista continua aparecendo para não ser trocada sem querer */}
            {e && !(REDES as readonly string[]).includes(e.rede) ? <option>{e.rede}</option> : null}
            {REDES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Data prevista" htmlFor={`${p}-data`}>
          <input id={`${p}-data`} name="data_prevista" type="date" defaultValue={e?.data_prevista} required className={`${inputClass} tabular`} />
        </Field>
      </div>
      <p aria-live="polite" className="text-[13.5px] font-medium text-crit empty:hidden">
        {estado?.erro ?? ''}
      </p>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variante="secundario" onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : e ? 'Salvar' : 'Adicionar entrega'}
        </Button>
      </div>
    </form>
  )
}
