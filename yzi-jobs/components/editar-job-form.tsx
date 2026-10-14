'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { salvarEdicaoJob } from '@/app/(app)/jobs/[id]/editar/actions'
import { CamposValores, SeletorMarca, SeletorTalentos } from '@/components/novo-job-form'
import { toast } from '@/components/toaster'
import { Button, ButtonLink } from '@/components/ui/button'
import { Checkbox, Field, inputClass } from '@/components/ui/field'
import { FormSection } from '@/components/ui/form-section'
import { useAvisoAoSair, useFocoNoPrimeiroErro } from '@/components/ui/formulario-longo'
import { SelectBusca } from '@/components/ui/select-busca'

type Opcao = { id: string; nome: string }

export type JobEdicao = {
  id: string
  codigo: string
  marca_id: string
  marca: { nome: string }
  vigencia_inicio: string
  vigencia_fim: string
  alvara_exigido: boolean
  vendido_por: string
  atendimento_id: string | null
  observacoes: string | null
  job_valores: { valor_total: number; fee_yzi: number; condicoes_pagamento: string | null } | null
  /** ids dos talentos atuais do job */
  talentos: string[]
  /** talentos que não podem sair, com o motivo */
  travados: Record<string, string>
}

export function EditarJobForm({
  job,
  marcas,
  talentos,
  vendedores,
  atendimento,
  trocaVendedor,
}: {
  job: JobEdicao
  marcas: Opcao[]
  talentos: (Opcao & { foto?: string | null })[]
  vendedores: Opcao[]
  atendimento: Opcao[]
  trocaVendedor: boolean
}) {
  const [estado, acao, pendente] = useActionState(salvarEdicaoJob, undefined)
  const form = useRef<HTMLFormElement>(null)
  useFocoNoPrimeiroErro(form, estado?.campos)
  useAvisoAoSair(form, Boolean(estado?.salvo))
  const [marcados, setMarcados] = useState(job.talentos)
  const router = useRouter()
  const erro = (c: string) => estado?.campos?.[c]
  const removidos = job.talentos.filter((t) => !marcados.includes(t))

  useEffect(() => {
    if (!estado?.salvo) return
    toast.success(`Job ${job.codigo} atualizado`)
    router.push(`/jobs/${job.id}`)
  }, [estado, router, job.codigo, job.id])

  // pessoa que já não está ativa continua aparecendo para não ser trocada sem querer
  const comAtual = (lista: Opcao[], id: string | null, rotulo: string) =>
    id && !lista.some((x) => x.id === id) ? [{ id, nome: rotulo }, ...lista] : lista

  return (
    <form ref={form} action={acao} noValidate>
      <input type="hidden" name="id" value={job.id} />

      <FormSection titulo="Ficha" descricao="Marca, vigência e quem responde pelo job.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SeletorMarca marcas={marcas} erro={erro('marca_id')} inicial={{ id: job.marca_id, nome: job.marca.nome }} />
          <Field label="Início da vigência" htmlFor="vigencia_inicio" erro={erro('vigencia_inicio')}>
            <input id="vigencia_inicio" name="vigencia_inicio" type="date" defaultValue={job.vigencia_inicio} required className={`${inputClass} tabular`} />
          </Field>
          <Field label="Fim da vigência" htmlFor="vigencia_fim" erro={erro('vigencia_fim')}>
            <input id="vigencia_fim" name="vigencia_fim" type="date" defaultValue={job.vigencia_fim} required className={`${inputClass} tabular`} />
          </Field>
          {trocaVendedor ? (
            <Field label="Vendido por" htmlFor="vendido-por" ajuda="Trocar transfere o job (e os valores) para outra analista.">
              <SelectBusca
                id="vendido-por"
                name="vendido_por"
                opcoes={comAtual(vendedores, job.vendido_por, 'Analista atual (acesso desativado)')}
                valorInicial={job.vendido_por}
              />
            </Field>
          ) : null}
          <Field label="Responsável no atendimento" htmlFor="atendimento">
            <SelectBusca
              id="atendimento"
              name="atendimento_id"
              opcoes={comAtual(atendimento, job.atendimento_id, 'Responsável atual (acesso desativado)')}
              valorInicial={job.atendimento_id ?? ''}
              vazio="A definir"
            />
          </Field>
        </div>
        <Checkbox name="alvara_exigido" defaultChecked={job.alvara_exigido} className="mt-4 font-medium">
          Este job exige alvará
        </Checkbox>
      </FormSection>

      <FormSection
        titulo="Talentos"
        descricao="Talento com NF andando, entrega publicada ou arquivo anexado não pode sair do job (fica com cadeado)."
      >
        <SeletorTalentos talentos={talentos} marcados={marcados} setMarcados={setMarcados} erro={erro('talentos')} travados={job.travados} exigirUm />
        {removidos.length ? (
          <p role="status" className="mt-3 rounded-md bg-prog-soft px-3 py-2 text-[13px] text-ink">
            Ao salvar, {removidos.length === 1 ? 'o talento removido sai' : 'os talentos removidos saem'} do job junto com as entregas dele que ainda
            não foram publicadas.
          </p>
        ) : null}
      </FormSection>

      {job.job_valores ? (
        <FormSection titulo="Valores" descricao="Visíveis só para quem tem alçada e para quem vendeu o job. A alteração fica no histórico.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CamposValores
              erroValor={erro('valor_total')}
              erroFee={erro('fee_yzi')}
              inicial={{ valor: job.job_valores.valor_total, fee: job.job_valores.fee_yzi }}
            />
            <Field label="Condições de pagamento" htmlFor="condicoes_pagamento" className="md:col-span-2">
              <input
                id="condicoes_pagamento"
                name="condicoes_pagamento"
                defaultValue={job.job_valores.condicoes_pagamento ?? ''}
                autoComplete="off"
                placeholder="Ex.: 30 dias após cada entrega…"
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>
      ) : null}

      <FormSection titulo="Observações" descricao="Opcional. Fica visível na ficha do job para todas as áreas.">
        <Field label="Observações" htmlFor="observacoes">
          <textarea id="observacoes" name="observacoes" rows={4} defaultValue={job.observacoes ?? ''} className={`${inputClass} py-2`} />
        </Field>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-bg px-4 py-3 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
        <p aria-live="polite" className="mr-auto text-[13.5px] font-medium text-crit">
          {estado?.erro ?? ''}
        </p>
        <ButtonLink href={`/jobs/${job.id}`} variante="secundario">
          Cancelar
        </ButtonLink>
        <Button type="submit" disabled={pendente || Boolean(estado?.salvo)}>
          {pendente || estado?.salvo ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
