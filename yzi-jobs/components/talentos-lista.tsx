'use client'

import { useActionState, useDeferredValue, useEffect, useRef, useState, useTransition } from 'react'
import {
  ArrowCounterClockwiseIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
  TrashIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { alterarAtivoTalento, cadastrarTalento, editarTalento, excluirTalento } from '@/app/(app)/cadastros/actions'
import { toast, useToastDeSucesso } from '@/components/toaster'
import { CampoFotoTalento } from '@/components/campo-foto-talento'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Field, inputClass } from '@/components/ui/field'
import { SelectBusca } from '@/components/ui/select-busca'
import { Janela, useJanela } from '@/components/ui/janela'
import { MenuAcoes } from '@/components/ui/menu-acoes'
import { OPCOES_POR_PAGINA, paginar, Paginacao } from '@/components/ui/paginacao'
import { EmptyState } from '@/components/ui/section'

type Opcao = { id: string; nome: string }
export type TalentoLinha = {
  id: string
  nome: string
  redes: string | null
  ativo: boolean
  analista_fixa_id: string | null
  jobs: number
  /** URL pública da foto (urlFotoTalento) ou null. */
  foto: string | null
}

type Filtro = 'ativos' | 'inativos' | 'todos'
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
  { valor: 'todos', rotulo: 'Todos' },
]

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function TalentosLista({ talentos, analistas }: { talentos: TalentoLinha[]; analistas: Opcao[] }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState<number>(OPCOES_POR_PAGINA[0])
  const termo = normalizar(useDeferredValue(busca).trim())
  const novo = useJanela()
  const topo = useRef<HTMLDivElement>(null)

  const nomeAnalista = new Map(analistas.map((a) => [a.id, a.nome]))
  const contagem = { ativos: 0, inativos: 0, todos: talentos.length }
  for (const t of talentos) contagem[t.ativo ? 'ativos' : 'inativos']++

  const visiveis = talentos.filter((t) => {
    if (filtro === 'ativos' && !t.ativo) return false
    if (filtro === 'inativos' && t.ativo) return false
    return !termo || normalizar(`${t.nome} ${t.redes ?? ''}`).includes(termo)
  })
  const pag = paginar(visiveis, pagina, porPagina)

  // trocar de página leva de volta ao início da tabela, não ao rodapé
  function irPara(p: number) {
    setPagina(p)
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    topo.current?.scrollIntoView({ block: 'start', behavior: suave ? 'smooth' : 'auto' })
  }

  const aba = (ativa: boolean) =>
    `inline-flex min-h-8 items-center gap-1.5 rounded-[5px] px-3 text-[13px] font-medium transition-colors motion-reduce:transition-none ${
      ativa ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]' : 'text-muted hover:text-ink'
    }`

  return (
    <>
      <div ref={topo} className="mb-4 flex scroll-mt-6 flex-wrap items-center gap-3">
        <div role="group" aria-label="Mostrar" className="inline-flex rounded-md bg-sunken p-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={filtro === f.valor}
              onClick={() => {
                setFiltro(f.valor)
                setPagina(1)
              }}
              className={aba(filtro === f.valor)}
            >
              {f.rotulo}
              <span className="tabular text-muted">{contagem[f.valor]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-[1_1_240px] sm:max-w-xs">
          <label htmlFor="busca-talento" className="sr-only">
            Buscar talento
          </label>
          <MagnifyingGlassIcon aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="busca-talento"
            type="search"
            autoComplete="off"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
            placeholder="Buscar por nome ou rede…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <Button type="button" onClick={novo.abrir} className="ml-auto">
          <PlusIcon aria-hidden="true" size={16} weight="bold" />
          Novo talento
        </Button>
      </div>

      {talentos.length === 0 ? (
        <EmptyState titulo="Nenhum talento cadastrado" icone={UsersThreeIcon}>
          Cadastre o primeiro talento para poder criar jobs com ele.
        </EmptyState>
      ) : visiveis.length === 0 ? (
        <EmptyState titulo="Nenhum talento encontrado" icone={MagnifyingGlassIcon}>
          {busca ? 'Confira a grafia ou procure em "Todos".' : filtro === 'inativos' ? 'Nenhum talento desativado.' : 'Nenhum talento nesta lista.'}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
          <table className="block w-full text-[13.5px] md:table">
            <caption className="sr-only">Talentos cadastrados</caption>
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-line bg-sunken text-left text-[12.5px] text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">Talento</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Analista fixa</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Redes</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Jobs</th>
                <th scope="col" className="w-12 px-3 py-2.5">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {pag.itens.map((t) => (
                <tr key={t.id} className="flex flex-wrap items-center gap-x-3 border-b border-line px-4 py-3 last:border-0 md:table-row md:p-0 [content-visibility:auto]">
                  <td className="block min-w-0 flex-1 md:table-cell md:px-4 md:py-2.5">
                    <div className={`flex min-w-0 items-center gap-3 ${t.ativo ? '' : 'opacity-60'}`}>
                      <Avatar nome={t.nome} foto={t.foto} tamanho="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {t.nome}
                          {t.ativo ? null : <span className="ml-2 rounded-md bg-sunken px-1.5 py-0.5 text-[11.5px] font-medium text-muted">Inativo</span>}
                        </span>
                        {/* no celular, os dados das colunas aparecem aqui */}
                        <span className="block truncate text-[12.5px] text-muted md:hidden">
                          {[t.analista_fixa_id ? nomeAnalista.get(t.analista_fixa_id) : null, t.redes, t.jobs === 1 ? '1 job' : `${t.jobs} jobs`]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    {t.analista_fixa_id && nomeAnalista.has(t.analista_fixa_id) ? nomeAnalista.get(t.analista_fixa_id) : <span className="text-muted">A definir</span>}
                  </td>
                  <td className="hidden max-w-[220px] truncate px-3 py-2.5 text-muted md:table-cell">{t.redes || '—'}</td>
                  <td className="tabular hidden px-3 py-2.5 text-right md:table-cell">{t.jobs}</td>
                  <td className="block md:table-cell md:px-3 md:py-2.5">
                    <AcoesTalento talento={t} analistas={analistas} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visiveis.length > 0 ? (
        <Paginacao
          total={visiveis.length}
          pagina={pag.atual}
          totalPaginas={pag.totalPaginas}
          porPagina={porPagina}
          inicio={pag.inicio}
          rotulo={visiveis.length === 1 ? 'talento' : 'talentos'}
          aoMudarPagina={irPara}
          aoMudarPorPagina={(n) => {
            setPorPagina(n)
            setPagina(1)
          }}
        />
      ) : null}

      <Janela janela={novo} titulo="Novo talento" descricao="O talento passa a aparecer na carteira e pode ser escolhido nos jobs.">
        <FormTalento analistas={analistas} fechar={novo.fechar} />
      </Janela>
    </>
  )
}

/** Menu "⋯" de um talento (Editar, Desativar/Reativar, Excluir). Usado em Cadastros e na carteira. */
export function AcoesTalento({ talento: t, analistas }: { talento: TalentoLinha; analistas: Opcao[] }) {
  const edicao = useJanela()
  const exclusao = useJanela()
  const [pendente, startTransition] = useTransition()

  function mudarAtivo(ativo: boolean) {
    startTransition(async () => {
      const r = await alterarAtivoTalento({ id: t.id, ativo })
      if (r.erro) {
        toast.error(`Não foi possível ${ativo ? 'reativar' : 'desativar'} ${t.nome}`, { description: r.erro })
        return
      }
      if (ativo) toast.success(`Talento ${t.nome} reativado`)
      else
        toast.success(`Talento ${t.nome} desativado`, {
          description: 'Saiu da carteira e do cadastro de jobs. Os jobs antigos continuam iguais.',
          action: {
            label: 'Desfazer',
            onClick: async () => {
              const d = await alterarAtivoTalento({ id: t.id, ativo: true })
              if (d.erro) toast.error(`Não foi possível reativar ${t.nome}`, { description: d.erro })
              else toast.success(`Talento ${t.nome} reativado`)
            },
          },
        })
    })
  }

  function excluir() {
    startTransition(async () => {
      const r = await excluirTalento({ id: t.id })
      if (r.erro) {
        toast.error(`Não foi possível excluir ${t.nome}`, { description: r.erro })
        return
      }
      exclusao.fechar()
      toast.success(`Talento ${t.nome} excluído`)
    })
  }

  return (
    <>
      <MenuAcoes
        rotulo={`Ações de ${t.nome}`}
        acoes={[
          { rotulo: 'Editar', icone: PencilSimpleIcon, aoClicar: edicao.abrir },
          t.ativo
            ? { rotulo: 'Desativar', icone: ProhibitIcon, aoClicar: () => mudarAtivo(false), desabilitada: pendente }
            : { rotulo: 'Reativar', icone: ArrowCounterClockwiseIcon, aoClicar: () => mudarAtivo(true), desabilitada: pendente },
          {
            rotulo: 'Excluir',
            icone: TrashIcon,
            aoClicar: exclusao.abrir,
            perigo: true,
            desabilitada: pendente,
            // só cadastros feitos por engano (sem nenhum job) podem ser apagados
            motivo: t.jobs ? `Já participou de ${t.jobs === 1 ? '1 job' : `${t.jobs} jobs`}. Desative em vez de excluir.` : undefined,
          },
        ]}
      />

      <Janela janela={edicao} titulo="Editar talento">
        <FormTalento talento={t} analistas={analistas} fechar={edicao.fechar} />
      </Janela>

      <Janela
        janela={exclusao}
        titulo={`Excluir ${t.nome}?`}
        descricao="O talento nunca entrou em um job, então pode ser apagado. Esta ação não pode ser desfeita."
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={exclusao.fechar}>
            Cancelar
          </Button>
          <Button type="button" variante="perigo" disabled={pendente} onClick={excluir}>
            {pendente ? 'Excluindo…' : 'Excluir talento'}
          </Button>
        </div>
      </Janela>
    </>
  )
}

/** Cadastro e edição usam o mesmo formulário; com `talento`, edita. */
function FormTalento({ talento: t, analistas, fechar }: { talento?: TalentoLinha; analistas: Opcao[]; fechar: () => void }) {
  const [estado, acao, pendente] = useActionState(t ? editarTalento : cadastrarTalento, undefined)
  const prefixo = t ? `tal-${t.id}` : 'tal-novo'
  useToastDeSucesso(estado)
  useEffect(() => {
    if (estado?.ok) fechar()
  }, [estado, fechar])

  return (
    <form action={acao} className="flex flex-col gap-4">
      {t ? <input type="hidden" name="id" value={t.id} /> : null}
      <CampoFotoTalento nome={t?.nome ?? ''} fotoAtual={t?.foto ?? null} />
      <Field label="Nome do talento" htmlFor={`${prefixo}-nome`}>
        <input id={`${prefixo}-nome`} name="nome" defaultValue={t?.nome} autoComplete="off" required className={inputClass} />
      </Field>
      <Field label="Analista fixa" htmlFor={`${prefixo}-analista`}>
        <SelectBusca
          id={`${prefixo}-analista`}
          name="analista_fixa_id"
          valorInicial={t?.analista_fixa_id ?? ''}
          vazio="A definir"
          opcoes={[
            // analista atual com acesso desativado: mantém a opção para não apagar o vínculo ao salvar
            ...(t?.analista_fixa_id && !analistas.some((a) => a.id === t.analista_fixa_id)
              ? [{ id: t.analista_fixa_id, nome: 'Analista atual (acesso desativado)' }]
              : []),
            ...analistas,
          ]}
        />
      </Field>
      <Field label="Redes" htmlFor={`${prefixo}-redes`} ajuda="Separe por vírgula.">
        <input id={`${prefixo}-redes`} name="redes" defaultValue={t?.redes ?? ''} autoComplete="off" placeholder="Ex.: Instagram, TikTok…" className={inputClass} />
      </Field>
      <p aria-live="polite" className="text-[13.5px] font-medium text-crit empty:hidden">
        {estado?.erro ?? ''}
      </p>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variante="secundario" onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : t ? 'Salvar' : 'Cadastrar talento'}
        </Button>
      </div>
    </form>
  )
}
