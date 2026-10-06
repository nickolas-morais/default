'use client'

import { LockSimpleIcon, PlusIcon, TrashIcon, XIcon } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from '@/components/toaster'
import { criarJob } from '@/app/(app)/jobs/novo/actions'
import { Avatar } from '@/components/ui/avatar'
import { Button, ButtonLink } from '@/components/ui/button'
import { Combobox, normalizar } from '@/components/ui/combobox'
import { Checkbox, Field, inputClass, Select } from '@/components/ui/field'
import { FormSection } from '@/components/ui/form-section'
import { useAvisoAoSair, useFocoNoPrimeiroErro } from '@/components/ui/formulario-longo'
import { InputMoeda } from '@/components/ui/input-moeda'
import { SelectBusca } from '@/components/ui/select-busca'
import { REDES } from '@/lib/status'

type Opcao = { id: string; nome: string }
/** Talento na escolha do job: com foto (URL) quando tiver. */
type OpcaoTalento = Opcao & { foto?: string | null }

let seq = 0
const novaLinha = () => ({ chave: ++seq, talento: '' })

export function NovoJobForm({
  marcas,
  talentos,
  vendedores,
  atendimento,
  usuarioId,
  escolheVendedor,
}: {
  marcas: Opcao[]
  talentos: OpcaoTalento[]
  vendedores: Opcao[]
  atendimento: Opcao[]
  usuarioId: string
  escolheVendedor: boolean
}) {
  const [estado, acao, pendente] = useActionState(criarJob, undefined)
  const form = useRef<HTMLFormElement>(null)
  useFocoNoPrimeiroErro(form, estado?.campos)
  useAvisoAoSair(form, Boolean(estado?.criado))
  const [marcados, setMarcados] = useState<string[]>([])
  const [linhas, setLinhas] = useState(() => [novaLinha()])
  const router = useRouter()
  const erro = (c: string) => estado?.campos?.[c]

  useEffect(() => {
    if (!estado?.criado) return
    toast.success('Job criado', { description: 'Todas as áreas já veem o job na matriz de status.' })
    router.push(`/jobs/${estado.criado}`)
  }, [estado, router])
  const talentosDoJob = talentos.filter((t) => marcados.includes(t.id))
  // com um só talento no job, toda entrega é dele; desmarcar um talento limpa as entregas dele
  const talentoDaLinha = (l: { talento: string }) => (marcados.length === 1 ? marcados[0] : marcados.includes(l.talento) ? l.talento : '')
  const umTalento = marcados.length === 1

  return (
    <form ref={form} action={acao} noValidate>
      <FormSection titulo="Ficha" descricao="Marca, vigência e quem responde pelo job.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SeletorMarca marcas={marcas} erro={erro('marca_id')} />
          <Field label="Início da vigência" htmlFor="vigencia_inicio" erro={erro('vigencia_inicio')}>
            <input id="vigencia_inicio" name="vigencia_inicio" type="date" required className={`${inputClass} tabular`} />
          </Field>
          <Field label="Fim da vigência" htmlFor="vigencia_fim" erro={erro('vigencia_fim')}>
            <input id="vigencia_fim" name="vigencia_fim" type="date" required className={`${inputClass} tabular`} />
          </Field>
          {escolheVendedor ? (
            <Field label="Vendido por" htmlFor="vendido-por" erro={erro('vendido_por')}>
              <SelectBusca id="vendido-por" name="vendido_por" opcoes={vendedores} valorInicial={usuarioId} invalido={Boolean(erro('vendido_por'))} />
            </Field>
          ) : null}
          <Field label="Responsável no atendimento" htmlFor="atendimento" ajuda="Pode ser definido depois.">
            <SelectBusca id="atendimento" name="atendimento_id" opcoes={atendimento} vazio="A definir" />
          </Field>
        </div>
        <Checkbox name="alvara_exigido" className="mt-4 font-medium">
          Este job exige alvará
        </Checkbox>
      </FormSection>

      <FormSection titulo="Talentos" descricao="Marque todos os talentos do job. Cada um emite a própria NF.">
        {talentos.length ? (
          <SeletorTalentos talentos={talentos} marcados={marcados} setMarcados={setMarcados} erro={erro('talentos')} />
        ) : (
          <p className="text-[14px] text-muted">Nenhum talento cadastrado. Cadastre os talentos em Cadastros antes de criar o job.</p>
        )}
      </FormSection>

      <FormSection
        titulo="Entregáveis"
        descricao={
          umTalento
            ? `Uma linha por entrega. Cada uma vira um item na agenda. Todas são de ${talentosDoJob[0]?.nome}.`
            : 'Uma linha por entrega. Cada uma vira um item na agenda e é de um dos talentos marcados acima.'
        }
      >
        <ol className="flex flex-col gap-3">
          {linhas.map((l, i) => (
            <li
              key={l.chave}
              className={`grid grid-cols-1 items-end gap-3 rounded-md border border-line bg-sunken/50 p-3 ${
                umTalento ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto]' : 'md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto]'
              }`}
            >
              <Field label={`Entrega ${i + 1}`} htmlFor={`ent_descricao_${l.chave}`}>
                <input id={`ent_descricao_${l.chave}`} name="ent_descricao" autoComplete="off" placeholder="Ex.: Reels 1 de 5…" className={inputClass} />
              </Field>
              {umTalento ? (
                <input type="hidden" name="ent_talento" value={marcados[0]} />
              ) : (
                <Field label="Talento" htmlFor={`ent_talento_${l.chave}`}>
                  {/* lista curta (só os talentos do job): select nativo */}
                  <Select
                    id={`ent_talento_${l.chave}`}
                    name="ent_talento"
                    value={talentoDaLinha(l)}
                    disabled={!marcados.length}
                    title={marcados.length ? undefined : 'Escolha os talentos do job acima'}
                    onChange={(e) => {
                      const talento = e.target.value
                      setLinhas((ls) => ls.map((x) => (x.chave === l.chave ? { ...x, talento } : x)))
                    }}
                  >
                    <option value="" disabled>
                      {marcados.length ? 'Escolha' : 'Marque acima'}
                    </option>
                    {talentosDoJob.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Rede" htmlFor={`ent_rede_${l.chave}`}>
                <Select id={`ent_rede_${l.chave}`} name="ent_rede" defaultValue="Instagram">
                  {REDES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Data prevista" htmlFor={`ent_data_${l.chave}`}>
                <input id={`ent_data_${l.chave}`} name="ent_data" type="date" className={`${inputClass} tabular`} />
              </Field>
              <button
                type="button"
                aria-label={`Remover entrega ${i + 1}`}
                title="Remover entrega"
                disabled={linhas.length === 1}
                onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-crit-soft hover:text-crit disabled:opacity-30"
              >
                <TrashIcon aria-hidden="true" size={18} />
              </button>
            </li>
          ))}
        </ol>
        {erro('entregaveis') ? (
          <p role="alert" className="mt-2 text-[12.5px] font-medium text-crit">
            {erro('entregaveis')}
          </p>
        ) : null}
        <Button type="button" variante="secundario" tamanho="sm" className="mt-3" onClick={() => setLinhas((ls) => [...ls, novaLinha()])}>
          <PlusIcon aria-hidden="true" size={14} weight="bold" />
          Adicionar entrega
        </Button>
      </FormSection>

      <FormSection titulo="Valores" descricao="Visíveis só para quem tem alçada e para quem vendeu o job.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CamposValores erroValor={erro('valor_total')} erroFee={erro('fee_yzi')} />
          <Field label="Condições de pagamento" htmlFor="condicoes_pagamento" className="md:col-span-2">
            <input id="condicoes_pagamento" name="condicoes_pagamento" autoComplete="off" placeholder="Ex.: 30 dias após cada entrega…" className={inputClass} />
          </Field>
        </div>
      </FormSection>

      <FormSection titulo="Observações" descricao="Opcional. Fica visível na ficha do job para todas as áreas.">
        <Field label="Observações" htmlFor="observacoes">
          <textarea id="observacoes" name="observacoes" rows={4} className={`${inputClass} py-2`} />
        </Field>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-bg px-4 py-3 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
        <p aria-live="polite" className="mr-auto text-[13.5px] font-medium text-crit">
          {estado?.erro ?? ''}
        </p>
        <ButtonLink href="/" variante="secundario">
          Cancelar
        </ButtonLink>
        <Button type="submit" disabled={pendente || Boolean(estado?.criado)}>
          {pendente || estado?.criado ? 'Criando job…' : 'Criar job'}
        </Button>
      </div>
    </form>
  )
}

// Listas longas: mostra no máximo isto de uma vez; a busca refina o resto.
const MAX_OPCOES = 50

export function SeletorMarca({ marcas, erro, inicial }: { marcas: Opcao[]; erro?: string; inicial?: Opcao }) {
  const [texto, setTexto] = useState(inicial?.nome ?? '')
  // id de uma marca existente, '__nova' para cadastrar o texto digitado, ou '' (nada escolhido)
  const [escolha, setEscolha] = useState(inicial?.id ?? '')
  const termo = normalizar(texto)
  const escolhida = marcas.find((m) => m.id === escolha)
  // mesma marca com outra grafia ("natura" e "Natura"): usa a existente em vez de criar outra
  const igual = termo ? marcas.find((m) => normalizar(m.nome) === termo) : undefined

  const filtradas = !termo || (escolhida && texto === escolhida.nome) ? marcas : marcas.filter((m) => normalizar(m.nome).includes(termo))
  const opcoes = [
    ...filtradas.slice(0, MAX_OPCOES).map((m) => ({ id: m.id, rotulo: m.nome })),
    ...(termo && !igual ? [{ id: '__nova', rotulo: `Cadastrar marca "${texto.trim()}"`, criar: true }] : []),
  ]
  const marcaId = escolha || igual?.id || ''

  const ajuda =
    escolha === '__nova'
      ? `"${texto.trim()}" será cadastrada ao salvar o job.`
      : termo && !marcaId
        ? 'Escolha uma marca da lista ou cadastre uma nova.'
        : marcas.length > MAX_OPCOES && !marcaId
          ? 'Digite para buscar entre todas as marcas.'
          : undefined

  return (
    <Field label="Marca" htmlFor="marca-job" erro={erro} ajuda={ajuda}>
      <Combobox
        id="marca-job"
        texto={texto}
        opcoes={opcoes}
        placeholder="Buscar ou cadastrar marca…"
        vazio="Nenhuma marca cadastrada. Digite o nome para cadastrar."
        invalido={Boolean(erro)}
        aoDigitar={(v) => {
          setTexto(v)
          setEscolha('')
        }}
        aoEscolher={(id) => {
          setEscolha(id)
          const m = marcas.find((x) => x.id === id)
          if (m) setTexto(m.nome)
        }}
      />
      <input type="hidden" name="marca_id" value={marcaId} />
      <input type="hidden" name="marca_nome" value={escolha === '__nova' ? texto.trim() : ''} />
    </Field>
  )
}

export function SeletorTalentos({
  talentos,
  marcados,
  setMarcados,
  erro,
  travados = {},
  exigirUm = false,
}: {
  talentos: OpcaoTalento[]
  marcados: string[]
  setMarcados: React.Dispatch<React.SetStateAction<string[]>>
  erro?: string
  /** Talentos que não podem sair do job, com o motivo (ex.: NF já emitida). */
  travados?: Record<string, string>
  /** Na edição, o último talento não pode sair (no cadastro, dá para trocar o único marcado). */
  exigirUm?: boolean
}) {
  const [texto, setTexto] = useState('')
  const termo = normalizar(texto)
  const nome = new Map(talentos.map((t) => [t.id, t.nome]))
  const foto = new Map(talentos.map((t) => [t.id, t.foto ?? null]))
  const opcoes = talentos
    .filter((t) => !termo || normalizar(t.nome).includes(termo))
    .slice(0, MAX_OPCOES)
    .map((t) => ({ id: t.id, rotulo: t.nome, marcada: marcados.includes(t.id), foto: t.foto ?? null }))

  // o job precisa de pelo menos um talento: o último marcado também fica travado
  const motivoTravado = (id: string) =>
    travados[id] ?? (exigirUm && marcados.length === 1 && marcados[0] === id ? 'O job precisa de pelo menos um talento.' : undefined)
  const alternar = (id: string) => {
    const motivo = marcados.includes(id) ? motivoTravado(id) : undefined
    if (motivo) return toast.info(`${nome.get(id)} não pode sair do job`, { description: motivo })
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Buscar talento"
        htmlFor="busca-talentos"
        erro={erro}
        ajuda={marcados.length ? undefined : 'Digite o nome e escolha na lista. Dá para marcar mais de um.'}
      >
        <Combobox
          id="busca-talentos"
          multipla
          texto={texto}
          opcoes={opcoes}
          placeholder="Nome do talento…"
          vazio="Nenhum talento com esse nome."
          invalido={Boolean(erro)}
          aoDigitar={setTexto}
          aoEscolher={(id) => {
            alternar(id)
            setTexto('')
          }}
        />
      </Field>

      {marcados.length ? (
        <div>
          <p className="mb-2 text-[12.5px] text-muted" aria-live="polite">
            {marcados.length === 1 ? '1 talento no job' : `${marcados.length} talentos no job`}
          </p>
          <ul className="flex flex-wrap gap-2">
            {marcados.map((id) => {
              const motivo = motivoTravado(id)
              return (
                <li key={id}>
                  <input type="hidden" name="talentos" value={id} />
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-accent bg-accent-soft pl-1 pr-1 text-[13.5px] font-medium">
                    <Avatar nome={nome.get(id) ?? ''} foto={foto.get(id)} tamanho="sm" />
                    {nome.get(id)}
                    {motivo ? (
                      // travado: o cadeado explica por que não sai (title no mouse, texto para leitor de tela)
                      <span title={motivo} className="grid size-6 place-items-center text-muted">
                        <LockSimpleIcon aria-hidden="true" size={12} weight="bold" />
                        <span className="sr-only">{`${nome.get(id)} não pode sair: ${motivo}`}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => alternar(id)}
                        aria-label={`Remover ${nome.get(id)}`}
                        className="grid size-6 place-items-center rounded text-muted hover:bg-surface hover:text-ink"
                      >
                        <XIcon aria-hidden="true" size={12} weight="bold" />
                      </button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Valor e fee com máscara de dinheiro; mostra o cachê e avisa na hora se o fee passa do valor. */
export function CamposValores({
  erroValor,
  erroFee,
  inicial,
}: {
  erroValor?: string
  erroFee?: string
  inicial?: { valor: number; fee: number }
}) {
  const [valor, setValor] = useState<number | null>(inicial ? Number(inicial.valor) : null)
  const [fee, setFee] = useState<number | null>(inicial ? Number(inicial.fee) : null)
  const feeAlto = valor !== null && fee !== null && fee > valor
  const cache = valor !== null && fee !== null && !feeAlto ? valor - fee : null

  return (
    <>
      <Field label="Valor do job" htmlFor="valor_total" erro={erroValor}>
        <InputMoeda id="valor_total" name="valor_total" valorInicial={inicial?.valor} aoMudar={setValor} invalido={Boolean(erroValor)} />
      </Field>
      <Field
        label="Fee da YZI"
        htmlFor="fee_yzi"
        erro={feeAlto ? 'O fee da YZI não pode passar do valor do job' : erroFee}
        ajuda={cache !== null ? `Cachê (valor menos fee): ${REAIS.format(cache)}` : undefined}
      >
        <InputMoeda id="fee_yzi" name="fee_yzi" valorInicial={inicial?.fee} aoMudar={setFee} invalido={feeAlto || Boolean(erroFee)} />
      </Field>
    </>
  )
}
