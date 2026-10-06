'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowCounterClockwiseIcon, CheckCircleIcon, PencilSimpleIcon, ProhibitIcon, TrashIcon } from '@phosphor-icons/react'
import { excluirJob, mudarSituacao } from '@/app/(app)/jobs/[id]/actions'
import { toast } from '@/components/toaster'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, inputClass } from '@/components/ui/field'
import { Janela, useJanela } from '@/components/ui/janela'
import { MenuAcoes } from '@/components/ui/menu-acoes'
import type { Situacao } from '@/types/dominio'

type Props = {
  jobId: string
  codigo: string
  situacao: Situacao
  /** Todas as áreas concluídas: finaliza direto, sem pedir confirmação. */
  pronto: boolean
  podeEncerrar: boolean
  podeExcluir: boolean
  temArquivos: boolean
  /** Ficha, valores e talentos (só em job ativo). */
  podeEditar: boolean
}

export function AcoesJob({ jobId, codigo, situacao, pronto, podeEncerrar, podeExcluir, temArquivos, podeEditar }: Props) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const finalizar = useJanela()
  const cancelar = useJanela()
  const excluir = useJanela()

  if (!podeEncerrar && !podeExcluir) return null

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>, sucesso: () => void, falha: string) {
    startTransition(async () => {
      const r = await acao()
      if (!r.ok) toast.error(falha, { description: r.erro })
      else sucesso()
    })
  }

  const reabrir = () =>
    executar(() => mudarSituacao({ acao: 'reabrir', jobId }), () => toast.success(`Job ${codigo} reaberto`), 'Não foi possível reabrir o job')

  function confirmarFinalizar() {
    executar(
      () => mudarSituacao({ acao: 'finalizar', jobId }),
      () => {
        finalizar.fechar()
        toast.success(`Job ${codigo} finalizado`, {
          description: 'Saiu dos alertas e da agenda. O histórico continua disponível.',
          action: { label: 'Desfazer', onClick: reabrir },
        })
      },
      'Não foi possível finalizar o job',
    )
  }

  const acoesMenu = [
    ...(podeEncerrar && situacao === 'ativo' ? [{ rotulo: 'Cancelar job', icone: ProhibitIcon, aoClicar: cancelar.abrir, perigo: true }] : []),
    ...(podeExcluir
      ? [
          {
            rotulo: 'Excluir job',
            icone: TrashIcon,
            aoClicar: excluir.abrir,
            perigo: true,
            motivo: temArquivos ? 'Tem arquivos anexados. Cancele em vez de excluir.' : undefined,
          },
        ]
      : []),
  ]

  return (
    <div className="flex items-center gap-2">
      {podeEditar && situacao === 'ativo' ? (
        <ButtonLink href={`/jobs/${jobId}/editar`} variante="secundario">
          <PencilSimpleIcon aria-hidden="true" size={16} />
          Editar job
        </ButtonLink>
      ) : null}
      {podeEncerrar && situacao === 'ativo' ? (
        <Button variante={pronto ? 'primario' : 'secundario'} disabled={pendente} onClick={pronto ? confirmarFinalizar : finalizar.abrir}>
          <CheckCircleIcon aria-hidden="true" size={16} />
          Finalizar job
        </Button>
      ) : null}
      {podeEncerrar && situacao !== 'ativo' ? (
        <Button variante="secundario" disabled={pendente} onClick={reabrir}>
          <ArrowCounterClockwiseIcon aria-hidden="true" size={16} />
          Reabrir job
        </Button>
      ) : null}
      {acoesMenu.length ? <MenuAcoes rotulo="Mais ações do job" acoes={acoesMenu} /> : null}

      <Janela
        janela={finalizar}
        titulo={`Finalizar ${codigo} com etapas abertas?`}
        descricao="Nem todas as áreas concluíram: há trilhas, NFs ou entregas em aberto. O job sai dos alertas e da agenda, e fica travado até ser reaberto."
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={finalizar.fechar}>
            Voltar
          </Button>
          <Button type="button" disabled={pendente} onClick={confirmarFinalizar}>
            {pendente ? 'Finalizando…' : 'Finalizar mesmo assim'}
          </Button>
        </div>
      </Janela>

      <Janela
        janela={cancelar}
        titulo={`Cancelar ${codigo}?`}
        descricao="O job sai dos alertas, da agenda e das metas comerciais. Ele continua visível em Cancelados e pode ser reaberto."
      >
        <FormCancelar
          pendente={pendente}
          fechar={cancelar.fechar}
          aoConfirmar={(motivo) =>
            executar(
              () => mudarSituacao({ acao: 'cancelar', jobId, motivo }),
              () => {
                cancelar.fechar()
                toast.success(`Job ${codigo} cancelado`, { action: { label: 'Desfazer', onClick: reabrir } })
              },
              'Não foi possível cancelar o job',
            )
          }
        />
      </Janela>

      <Janela
        janela={excluir}
        titulo={`Excluir ${codigo} de vez?`}
        descricao="Use só para job criado por engano. Talentos, entregas, valores e histórico do job são apagados, e isso não pode ser desfeito. Para encerrar um job real, cancele."
      >
        <FormExcluir
          codigo={codigo}
          pendente={pendente}
          fechar={excluir.fechar}
          aoConfirmar={(confirmacao) =>
            executar(
              () => excluirJob({ jobId, confirmacao }),
              () => {
                toast.success(`Job ${codigo} excluído`)
                router.push('/')
              },
              'Não foi possível excluir o job',
            )
          }
        />
      </Janela>
    </div>
  )
}

function FormCancelar({ pendente, fechar, aoConfirmar }: { pendente: boolean; fechar: () => void; aoConfirmar: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('')
  const valido = motivo.trim().length >= 3
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valido) aoConfirmar(motivo.trim())
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Motivo do cancelamento" htmlFor="motivo-cancelamento" ajuda="Fica registrado no histórico do job.">
        <textarea
          id="motivo-cancelamento"
          rows={3}
          maxLength={500}
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={`${inputClass} py-2`}
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variante="secundario" onClick={fechar}>
          Voltar
        </Button>
        <Button type="submit" variante="perigo" disabled={pendente || !valido}>
          {pendente ? 'Cancelando…' : 'Cancelar job'}
        </Button>
      </div>
    </form>
  )
}

function FormExcluir({ codigo, pendente, fechar, aoConfirmar }: { codigo: string; pendente: boolean; fechar: () => void; aoConfirmar: (c: string) => void }) {
  const [texto, setTexto] = useState('')
  const confere = texto.trim().toUpperCase() === codigo.toUpperCase()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (confere) aoConfirmar(texto)
      }}
      className="flex flex-col gap-4"
    >
      <Field label={`Digite ${codigo} para confirmar`} htmlFor="confirmar-exclusao">
        <input
          id="confirmar-exclusao"
          autoComplete="off"
          spellCheck={false}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={`${inputClass} tabular`}
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variante="secundario" onClick={fechar}>
          Voltar
        </Button>
        <Button type="submit" variante="perigo" disabled={pendente || !confere}>
          {pendente ? 'Excluindo…' : 'Excluir job'}
        </Button>
      </div>
    </form>
  )
}
