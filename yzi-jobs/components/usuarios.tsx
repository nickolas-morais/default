'use client'

import { useActionState, useDeferredValue, useEffect, useRef, useState, useTransition } from 'react'
import {
  ArrowCounterClockwiseIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  TrashIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { alterarAcesso, convidarUsuario, editarUsuario, excluirUsuario, reenviarConvite } from '@/app/(app)/admin/usuarios/actions'
import { toast, useToastDeSucesso } from '@/components/toaster'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { normalizar } from '@/components/ui/combobox'
import { Field, inputClass, Select } from '@/components/ui/field'
import { Janela, useJanela } from '@/components/ui/janela'
import { MenuAcoes } from '@/components/ui/menu-acoes'
import { EmptyState } from '@/components/ui/section'
import { PERFIS, PERFIL_LABEL, type Perfil } from '@/lib/perfis'

export function ConviteForm() {
  const [estado, acao, pendente] = useActionState(convidarUsuario, undefined)
  const form = useRef<HTMLFormElement>(null)
  useToastDeSucesso(estado)
  useEffect(() => {
    if (estado?.ok) form.current?.reset()
  }, [estado])

  return (
    <form ref={form} action={acao} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nome" htmlFor="nome">
          <input id="nome" name="nome" autoComplete="off" required className={inputClass} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="off" spellCheck={false} required className={inputClass} />
        </Field>
        <Field label="Perfil" htmlFor="perfil" ajuda="O perfil define o que a pessoa vê e altera." className="md:col-span-2">
          <Select id="perfil" name="perfil" defaultValue="analista_atendimento">
            {PERFIS.map((p) => (
              <option key={p} value={p}>
                {PERFIL_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p aria-live="polite" className="mr-auto text-[13.5px] font-medium text-crit">
          {estado?.erro ?? ''}
        </p>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Enviando…' : 'Enviar convite'}
        </Button>
      </div>
    </form>
  )
}

export type Pessoa = {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  /** Convidada e ainda não entrou no sistema. */
  pendente: boolean
  foto: string | null
}

type Filtro = 'ativos' | 'inativos' | 'todos'
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
  { valor: 'todos', rotulo: 'Todos' },
]

export function EquipeLista({ pessoas, eu }: { pessoas: Pessoa[]; eu: string }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const termo = normalizar(useDeferredValue(busca))
  const contagem = { ativos: pessoas.filter((p) => p.ativo).length, inativos: pessoas.filter((p) => !p.ativo).length, todos: pessoas.length }
  const visiveis = pessoas.filter((p) => {
    if (filtro === 'ativos' && !p.ativo) return false
    if (filtro === 'inativos' && p.ativo) return false
    return !termo || normalizar(`${p.nome} ${p.email} ${PERFIL_LABEL[p.perfil]}`).includes(termo)
  })

  const aba = (ativa: boolean) =>
    `inline-flex min-h-8 items-center gap-1.5 rounded-[5px] px-3 text-[13px] font-medium transition-colors motion-reduce:transition-none ${
      ativa ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]' : 'text-muted hover:text-ink'
    }`

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Mostrar" className="inline-flex rounded-md bg-sunken p-0.5">
          {FILTROS.map((f) => (
            <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)} className={aba(filtro === f.valor)}>
              {f.rotulo}
              <span className="tabular text-muted">{contagem[f.valor]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-[1_1_240px] sm:max-w-xs">
          <label htmlFor="busca-equipe" className="sr-only">
            Buscar pessoa
          </label>
          <MagnifyingGlassIcon aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="busca-equipe"
            type="search"
            autoComplete="off"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome, e-mail ou perfil…"
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState titulo="Ninguém encontrado" icone={UsersThreeIcon}>
          {busca ? 'Confira a grafia ou procure em "Todos".' : filtro === 'inativos' ? 'Nenhuma pessoa desativada.' : 'Nenhuma pessoa nesta lista.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface">
          {visiveis.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className={`flex min-w-0 flex-1 items-center gap-3 ${p.ativo ? '' : 'opacity-60'}`}>
                <Avatar nome={p.nome} foto={p.foto} />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.nome}
                    {p.id === eu ? <span className="font-normal text-muted"> (você)</span> : null}
                  </p>
                  <p className="truncate text-[12.5px] text-muted">{p.email}</p>
                  {/* no celular, perfil e situação aparecem embaixo do e-mail */}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] sm:hidden">
                    {PERFIL_LABEL[p.perfil]}
                    <Situacao pessoa={p} />
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <span className="text-[13.5px]">{PERFIL_LABEL[p.perfil]}</span>
                <Situacao pessoa={p} />
              </div>
              <AcoesUsuario pessoa={p} eu={p.id === eu} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Situacao({ pessoa: p }: { pessoa: Pessoa }) {
  const [rotulo, cor] = !p.ativo
    ? ['Inativo', 'bg-sunken text-muted']
    : p.pendente
      ? ['Convite pendente', 'bg-prog-soft text-prog']
      : ['Ativo', 'bg-done-soft text-done']
  return <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${cor}`}>{rotulo}</span>
}

function AcoesUsuario({ pessoa: p, eu }: { pessoa: Pessoa; eu: boolean }) {
  const edicao = useJanela()
  const desativar = useJanela()
  const exclusao = useJanela()
  const [pendente, startTransition] = useTransition()

  function executar(acao: () => Promise<{ erro?: string }>, sucesso: () => void, falha: string) {
    startTransition(async () => {
      const r = await acao()
      if (r.erro) toast.error(falha, { description: r.erro })
      else sucesso()
    })
  }

  const reativar = () =>
    executar(() => alterarAcesso({ id: p.id, ativo: true }), () => toast.success(`Acesso de ${p.nome} reativado`), `Não foi possível reativar ${p.nome}`)

  return (
    <>
      <MenuAcoes
        rotulo={`Ações de ${p.nome}`}
        acoes={[
          { rotulo: 'Editar', icone: PencilSimpleIcon, aoClicar: edicao.abrir },
          ...(p.pendente && p.ativo
            ? [
                {
                  rotulo: 'Reenviar convite',
                  icone: EnvelopeSimpleIcon,
                  desabilitada: pendente,
                  aoClicar: () =>
                    executar(() => reenviarConvite({ id: p.id }), () => toast.success(`Convite reenviado para ${p.email}`), 'Não foi possível reenviar o convite'),
                },
              ]
            : []),
          p.ativo
            ? {
                rotulo: 'Desativar acesso',
                icone: ProhibitIcon,
                aoClicar: desativar.abrir,
                desabilitada: pendente,
                motivo: eu ? 'Você não pode desativar o próprio acesso.' : undefined,
              }
            : { rotulo: 'Reativar acesso', icone: ArrowCounterClockwiseIcon, aoClicar: reativar, desabilitada: pendente },
          {
            rotulo: 'Excluir',
            icone: TrashIcon,
            aoClicar: exclusao.abrir,
            perigo: true,
            desabilitada: pendente,
            // quem já entrou pode ter jobs, histórico e metas: desativar preserva tudo
            motivo: eu ? 'Você não pode excluir o próprio usuário.' : p.pendente ? undefined : 'Já entrou no sistema. Desative em vez de excluir.',
          },
        ]}
      />

      <Janela janela={edicao} titulo={`Editar ${p.nome}`}>
        <FormEditar pessoa={p} eu={eu} fechar={edicao.fechar} />
      </Janela>

      <Janela
        janela={desativar}
        titulo={`Desativar o acesso de ${p.nome}?`}
        descricao="A pessoa não consegue mais entrar no sistema. Os jobs, o histórico e as metas dela continuam, e o acesso pode ser reativado depois."
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={desativar.fechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variante="perigo"
            disabled={pendente}
            onClick={() =>
              executar(
                () => alterarAcesso({ id: p.id, ativo: false }),
                () => {
                  desativar.fechar()
                  toast.success(`Acesso de ${p.nome} desativado`, { action: { label: 'Desfazer', onClick: reativar } })
                },
                `Não foi possível desativar ${p.nome}`,
              )
            }
          >
            {pendente ? 'Desativando…' : 'Desativar acesso'}
          </Button>
        </div>
      </Janela>

      <Janela
        janela={exclusao}
        titulo={`Excluir o convite de ${p.nome}?`}
        descricao={`${p.email} nunca entrou no sistema. O convite deixa de valer e o cadastro é apagado. Para convidar de novo, use "Convidar pessoa".`}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={exclusao.fechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variante="perigo"
            disabled={pendente}
            onClick={() =>
              executar(
                () => excluirUsuario({ id: p.id }),
                () => {
                  exclusao.fechar()
                  toast.success(`Convite de ${p.nome} excluído`)
                },
                `Não foi possível excluir ${p.nome}`,
              )
            }
          >
            {pendente ? 'Excluindo…' : 'Excluir'}
          </Button>
        </div>
      </Janela>
    </>
  )
}

function FormEditar({ pessoa: p, eu, fechar }: { pessoa: Pessoa; eu: boolean; fechar: () => void }) {
  const [estado, acao, pendente] = useActionState(editarUsuario, undefined)
  useToastDeSucesso(estado)
  useEffect(() => {
    if (estado?.ok) fechar()
  }, [estado, fechar])

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={p.id} />
      <Field label="Nome" htmlFor={`nome-${p.id}`}>
        <input id={`nome-${p.id}`} name="nome" defaultValue={p.nome} autoComplete="off" required className={inputClass} />
      </Field>
      <Field label="E-mail" htmlFor={`email-${p.id}`} ajuda="É o login da pessoa. Ao trocar, ela passa a entrar com o novo e-mail.">
        <input id={`email-${p.id}`} name="email" type="email" defaultValue={p.email} autoComplete="off" spellCheck={false} required className={inputClass} />
      </Field>
      <Field
        label="Perfil"
        htmlFor={`perfil-${p.id}`}
        ajuda={eu ? 'Você não pode alterar o próprio perfil.' : 'O perfil define o que a pessoa vê e altera, inclusive os valores dos jobs.'}
      >
        {/* lista fixa: select nativo. O próprio perfil fica travado; disabled não envia, então vai num campo oculto */}
        <Select id={`perfil-${p.id}`} name={eu ? undefined : 'perfil'} defaultValue={p.perfil} disabled={eu}>
          {PERFIS.map((x) => (
            <option key={x} value={x}>
              {PERFIL_LABEL[x]}
            </option>
          ))}
        </Select>
        {eu ? <input type="hidden" name="perfil" value={p.perfil} /> : null}
      </Field>
      <p aria-live="polite" className="text-[13.5px] font-medium text-crit empty:hidden">
        {estado?.erro ?? ''}
      </p>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variante="secundario" onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
