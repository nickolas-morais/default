'use client'

import { useActionState, useDeferredValue, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { CaretRightIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, StorefrontIcon, TrashIcon } from '@phosphor-icons/react'
import { cadastrarMarca, editarMarca, excluirMarca, listarJobsDaMarca, type JobDaMarca } from '@/app/(app)/cadastros/actions'
import { toast, useToastDeSucesso } from '@/components/toaster'
import { Button } from '@/components/ui/button'
import { normalizar } from '@/components/ui/combobox'
import { Field, inputClass } from '@/components/ui/field'
import { Janela, useJanela } from '@/components/ui/janela'
import { MenuAcoes } from '@/components/ui/menu-acoes'
import { OPCOES_POR_PAGINA, paginar, Paginacao } from '@/components/ui/paginacao'
import { EmptyState } from '@/components/ui/section'
import { data, hojeSP } from '@/lib/format'

export type MarcaLinha = { id: string; nome: string; criada_em: string; jobs: number }

export function MarcasLista({ marcas }: { marcas: MarcaLinha[] }) {
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState<number>(OPCOES_POR_PAGINA[0])
  const termo = normalizar(useDeferredValue(busca))
  const nova = useJanela()
  const topo = useRef<HTMLDivElement>(null)

  const visiveis = termo ? marcas.filter((m) => normalizar(m.nome).includes(termo)) : marcas
  const pag = paginar(visiveis, pagina, porPagina)

  function irPara(p: number) {
    setPagina(p)
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    topo.current?.scrollIntoView({ block: 'start', behavior: suave ? 'smooth' : 'auto' })
  }

  return (
    <>
      <div ref={topo} className="mb-4 flex scroll-mt-6 flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-[1_1_240px] sm:max-w-xs">
          <label htmlFor="busca-marca" className="sr-only">
            Buscar marca
          </label>
          <MagnifyingGlassIcon aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="busca-marca"
            type="search"
            autoComplete="off"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
            placeholder="Buscar marca…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <Button type="button" onClick={nova.abrir} className="ml-auto">
          <PlusIcon aria-hidden="true" size={16} weight="bold" />
          Nova marca
        </Button>
      </div>

      {marcas.length === 0 ? (
        <EmptyState titulo="Nenhuma marca cadastrada" icone={StorefrontIcon}>
          Cadastre aqui ou direto no cadastro do job.
        </EmptyState>
      ) : visiveis.length === 0 ? (
        <EmptyState titulo="Nenhuma marca encontrada" icone={MagnifyingGlassIcon}>
          Confira a grafia ou cadastre a marca.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
          <table className="w-full text-[13.5px]">
            <caption className="sr-only">Marcas cadastradas</caption>
            <thead>
              <tr className="border-b border-line bg-sunken text-left text-[12.5px] text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">Marca</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Jobs</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">Cadastrada em</th>
                <th scope="col" className="w-12 px-3 py-2.5">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pag.itens.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="max-w-0 truncate px-4 py-2.5 font-medium">{m.nome}</td>
                  <td className="px-3 py-2 text-right">
                    {m.jobs ? <JobsDaMarca marca={m} /> : <span className="tabular text-muted">0</span>}
                  </td>
                  <td className="tabular hidden px-3 py-2.5 text-muted sm:table-cell">{data(m.criada_em.slice(0, 10))}</td>
                  <td className="px-3 py-2">
                    <AcoesMarca marca={m} />
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
          rotulo={visiveis.length === 1 ? 'marca' : 'marcas'}
          aoMudarPagina={irPara}
          aoMudarPorPagina={(n) => {
            setPorPagina(n)
            setPagina(1)
          }}
        />
      ) : null}

      <Janela janela={nova} titulo="Nova marca">
        <FormMarca fechar={nova.fechar} />
      </Janela>
    </>
  )
}

function AcoesMarca({ marca: m }: { marca: MarcaLinha }) {
  const edicao = useJanela()
  const exclusao = useJanela()
  const [pendente, startTransition] = useTransition()

  function excluir() {
    startTransition(async () => {
      const r = await excluirMarca({ id: m.id })
      if (r.erro) {
        toast.error(`Não foi possível excluir ${m.nome}`, { description: r.erro })
        return
      }
      exclusao.fechar()
      toast.success(`Marca ${m.nome} excluída`)
    })
  }

  return (
    <>
      <MenuAcoes
        rotulo={`Ações de ${m.nome}`}
        acoes={[
          { rotulo: 'Editar', icone: PencilSimpleIcon, aoClicar: edicao.abrir },
          {
            rotulo: 'Excluir',
            icone: TrashIcon,
            aoClicar: exclusao.abrir,
            perigo: true,
            desabilitada: pendente,
            // marca com job não pode sair: os jobs dependem dela
            motivo: m.jobs ? `Tem ${m.jobs === 1 ? '1 job' : `${m.jobs} jobs`}. Só marcas sem jobs podem ser excluídas.` : undefined,
          },
        ]}
      />
      <Janela
        janela={edicao}
        titulo="Editar marca"
        descricao={
          m.jobs === 0 ? undefined : m.jobs === 1 ? 'O novo nome aparece no job desta marca.' : `O novo nome aparece nos ${m.jobs} jobs desta marca.`
        }
      >
        <FormMarca marca={m} fechar={edicao.fechar} />
      </Janela>
      <Janela janela={exclusao} titulo={`Excluir ${m.nome}?`} descricao="A marca não tem jobs, então pode ser apagada. Esta ação não pode ser desfeita.">
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={exclusao.fechar}>
            Cancelar
          </Button>
          <Button type="button" variante="perigo" disabled={pendente} onClick={excluir}>
            {pendente ? 'Excluindo…' : 'Excluir marca'}
          </Button>
        </div>
      </Janela>
    </>
  )
}

/** Cadastro e edição usam o mesmo formulário; com `marca`, edita. */
function FormMarca({ marca: m, fechar }: { marca?: MarcaLinha; fechar: () => void }) {
  const [estado, acao, pendente] = useActionState(m ? editarMarca : cadastrarMarca, undefined)
  const campo = m ? `marca-nome-${m.id}` : 'marca-nome-nova'
  useToastDeSucesso(estado)
  useEffect(() => {
    if (estado?.ok) fechar()
  }, [estado, fechar])

  return (
    <form action={acao} className="flex flex-col gap-4">
      {m ? <input type="hidden" name="id" value={m.id} /> : null}
      <Field label="Nome da marca" htmlFor={campo} erro={estado?.erro}>
        <input id={campo} name="nome" defaultValue={m?.nome} autoComplete="off" required className={inputClass} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variante="secundario" onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : m ? 'Salvar' : 'Cadastrar marca'}
        </Button>
      </div>
    </form>
  )
}

/** "3 jobs" na tabela: abre a lista de jobs da marca, buscada só na hora de abrir. */
function JobsDaMarca({ marca: m }: { marca: MarcaLinha }) {
  const janela = useJanela()
  const [jobs, setJobs] = useState<JobDaMarca[] | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, startTransition] = useTransition()
  const hoje = hojeSP()

  function abrir() {
    janela.abrir()
    setErro('')
    startTransition(async () => {
      const r = await listarJobsDaMarca({ id: m.id })
      if (r.erro) setErro(r.erro)
      else setJobs(r.jobs ?? [])
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={`Ver ${m.jobs === 1 ? 'o job' : `os ${m.jobs} jobs`} de ${m.nome}`}
        className="tabular inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[13.5px] font-medium text-accent hover:bg-accent-soft"
      >
        {m.jobs === 1 ? '1 job' : `${m.jobs} jobs`}
        <CaretRightIcon aria-hidden="true" size={12} weight="bold" />
      </button>
      <Janela janela={janela} titulo={`Jobs de ${m.nome}`} descricao={m.jobs === 1 ? '1 job, do mais recente ao mais antigo.' : `${m.jobs} jobs, do mais recente ao mais antigo.`}>
        {erro ? (
          <p role="alert" className="text-[13.5px] font-medium text-crit">
            {erro}
          </p>
        ) : carregando || !jobs ? (
          <div aria-busy="true" aria-label="Carregando jobs…" className="flex flex-col gap-2">
            {Array.from({ length: Math.min(m.jobs, 4) }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-sunken motion-reduce:animate-none" />
            ))}
          </div>
        ) : (
          <ul className="-mx-2 flex max-h-[min(420px,60dvh)] flex-col overflow-y-auto">
            {jobs.map((j) => {
              const encerrado = j.vigencia_fim < hoje
              return (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} onClick={janela.fechar} className="flex min-h-12 items-center gap-3 rounded-md px-2 py-2 hover:bg-sunken">
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[14px] font-medium ${encerrado ? 'text-muted' : ''}`}>{j.talentos || 'Sem talento'}</span>
                      <span className="tabular block truncate text-[12.5px] text-muted">
                        {j.codigo}, {data(j.vigencia_inicio)} a {data(j.vigencia_fim)}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium ${encerrado ? 'bg-sunken text-muted' : 'bg-done-soft text-done'}`}>
                      {encerrado ? 'Encerrado' : 'Vigente'}
                    </span>
                    <CaretRightIcon aria-hidden="true" size={12} className="shrink-0 text-muted" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-4 flex justify-end border-t border-line pt-4">
          <Button type="button" variante="secundario" onClick={janela.fechar}>
            Fechar
          </Button>
        </div>
      </Janela>
    </>
  )
}
