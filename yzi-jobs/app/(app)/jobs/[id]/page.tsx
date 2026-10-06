import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaretRightIcon, CheckCircleIcon, FileTextIcon, LockSimpleIcon, ProhibitIcon, WarningIcon } from '@phosphor-icons/react/ssr'
import { AcoesJob } from '@/components/acoes-job'
import { MenuEntrega, NovaEntrega } from '@/components/entregas-acoes'
import { ExcluirArquivo } from '@/components/excluir-arquivo'
import { StatusSelect } from '@/components/status-select'
import { UploadArquivo } from '@/components/upload-arquivo'
import { ValidadeAlvara } from '@/components/validade-alvara'
import { Avatar } from '@/components/ui/avatar'
import { Section } from '@/components/ui/section'
import { obterJob } from '@/lib/dados'
import { urlFoto, urlFotoTalento } from '@/lib/foto'
import { brl, data, dataHora, diasAte, hojeSP } from '@/lib/format'
import { descreverHistorico } from '@/lib/historico'
import { podeAlterar, podeEditarEntregas, podeEncerrar, podeExcluirEntrega, podeExcluirJob, veTodosValores, type Alvo } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'
import { ENT_PUBLICADO, prontoParaFinalizar, rotulo } from '@/lib/status'

export const metadata: Metadata = { title: 'Detalhe do job' }

const ROTULO_ARQUIVO = { contrato: 'Contrato', nf_yzi: 'NF da YZI', nf_talento: 'NF do talento', outro: 'Outro' } as const

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ supabase, usuario }, { id }] = await Promise.all([exigirSessao(), params])
  const resultado = await obterJob(supabase, id)
  if (!resultado) notFound()
  const { job, historico, arquivos, alertas } = resultado

  const p = usuario.perfil
  const nome = `${job.job_talentos.map((t) => t.talento.nome).join(' + ')} × ${job.marca.nome}`
  const redes = [...new Set(job.entregaveis.map((e) => e.rede))].join(', ') || '—'
  const valores = job.job_valores
  const varios = job.job_talentos.length > 1
  const hoje = hojeSP()
  const veValores = valores !== null
  const ativo = job.situacao === 'ativo'
  const pronto = ativo && prontoParaFinalizar(job)
  // job encerrado fica travado (o banco também recusa): reabra para alterar
  const pode = (alvo: Alvo) => ativo && podeAlterar(p, alvo)
  const editaEntregas = ativo && podeEditarEntregas(p, job.vendido_por, usuario.id)
  const talentosDoJob = job.job_talentos.map((t) => t.talento)
  const encerramento = job.encerrado_em
    ? `Em ${dataHora(job.encerrado_em)}${job.encerrador ? `, por ${job.encerrador.nome}` : ''}.`
    : ''
  const publicadas = job.entregaveis.filter((e) => e.status === ENT_PUBLICADO).length
  const tiposUpload = [
    ...(veValores || p === 'analista_juridico_adm' ? [{ valor: 'contrato', rotulo: 'Contrato' }] : []),
    ...(veValores ? [{ valor: 'nf_yzi', rotulo: 'NF da YZI' }, { valor: 'nf_talento', rotulo: 'NF do talento' }] : []),
    { valor: 'outro', rotulo: 'Outro documento' },
  ]

  return (
    <>
      <nav aria-label="Você está em" className="mb-4">
        <ol className="flex items-center gap-1.5 text-[13px] text-muted">
          <li>
            <Link href="/" className="rounded-sm hover:text-ink hover:underline">
              Matriz de status
            </Link>
          </li>
          <li aria-hidden="true">
            <CaretRightIcon size={12} />
          </li>
          <li aria-current="page" className="tabular text-ink">
            {job.codigo}
          </li>
        </ol>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {/* fotos dos talentos, sobrepostas quando são vários */}
          <div className="mb-3 flex -space-x-2">
            {job.job_talentos.map((jt) => (
              <span key={jt.talento.id} title={jt.talento.nome} className="rounded-full ring-2 ring-bg">
                <Avatar nome={jt.talento.nome} foto={urlFotoTalento(jt.talento.foto_path)} tamanho="lg" />
              </span>
            ))}
          </div>
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] md:text-[28px]">{nome}</h1>
          <p className="tabular mt-1.5 text-[14px] text-muted">
            Vigência de {data(job.vigencia_inicio)} a {data(job.vigencia_fim)}
          </p>
        </div>
        <AcoesJob
          jobId={job.id}
          codigo={job.codigo}
          situacao={job.situacao}
          pronto={pronto}
          podeEncerrar={podeEncerrar(p, job.vendido_por, usuario.id)}
          podeExcluir={podeExcluirJob(p)}
          temArquivos={arquivos.length > 0}
          podeEditar={podeEncerrar(p, job.vendido_por, usuario.id)}
        />
      </header>

      {job.situacao === 'finalizado' ? (
        <div role="status" className="mb-6 flex gap-3 rounded-[10px] border border-done/25 bg-done-soft px-4 py-3.5">
          <CheckCircleIcon aria-hidden="true" size={20} weight="fill" className="mt-px shrink-0 text-done" />
          <div className="text-[13.5px]">
            <p className="font-semibold text-done">Job finalizado</p>
            <p>{encerramento} As etapas ficam travadas até o job ser reaberto.</p>
          </div>
        </div>
      ) : job.situacao === 'cancelado' ? (
        <div role="status" className="mb-6 flex gap-3 rounded-[10px] border border-line-strong bg-sunken px-4 py-3.5">
          <ProhibitIcon aria-hidden="true" size={20} weight="fill" className="mt-px shrink-0 text-muted" />
          <div className="text-[13.5px]">
            <p className="font-semibold">Job cancelado</p>
            <p className="text-muted">{encerramento} Não entra nos alertas, na agenda nem nas metas.</p>
            {job.motivo_cancelamento ? <p className="mt-1">Motivo: {job.motivo_cancelamento}</p> : null}
          </div>
        </div>
      ) : pronto ? (
        <div role="status" className="mb-6 flex gap-3 rounded-[10px] border border-accent/25 bg-accent-soft px-4 py-3.5">
          <CheckCircleIcon aria-hidden="true" size={20} weight="fill" className="mt-px shrink-0 text-accent" />
          <div className="text-[13.5px]">
            <p className="font-semibold">Pronto para finalizar</p>
            <p className="text-muted">Todas as áreas concluíram, as entregas foram publicadas e as NFs estão pagas.</p>
          </div>
        </div>
      ) : null}

      {alertas.length > 0 ? (
        <div role="status" className="mb-6 flex gap-3 rounded-[10px] border border-crit/25 bg-crit-soft px-4 py-3.5 text-ink">
          <WarningIcon aria-hidden="true" size={20} weight="fill" className="mt-px shrink-0 text-crit" />
          <div>
            <p className="font-semibold text-crit">{alertas.length === 1 ? '1 alerta neste job' : `${alertas.length} alertas neste job`}</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-[13.5px]">
              {alertas.map((a) => (
                <li key={`${a.tipo}-${a.entregavel_id ?? ''}`}>{a.descricao}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section titulo="Trilhas por área" descricao="Cada área atualiza a própria etapa." semPadding>
            <ul className="divide-y divide-line">
              <Trilha titulo="Jurídico" sub="Contrato com a marca">
                <StatusSelect jobId={job.id} alvo="jur" trilha="jur" valor={job.jur_status} rotulo="Jurídico" podeAlterar={pode('jur')} />
              </Trilha>
              <Trilha titulo="Administrativo" sub="Cadastros e documentos">
                <StatusSelect jobId={job.id} alvo="adm" trilha="adm" valor={job.adm_status} rotulo="Administrativo" podeAlterar={pode('adm')} />
              </Trilha>
              <Trilha titulo="Financeiro" sub="NF da YZI">
                <StatusSelect jobId={job.id} alvo="nf_yzi" trilha="nf" valor={job.nf_yzi_status} rotulo="NF da YZI" podeAlterar={pode('nf_yzi')} />
              </Trilha>
              {job.job_talentos.map((jt) => (
                <Trilha key={jt.talento.id} titulo="NF do talento" sub={jt.talento.nome}>
                  <StatusSelect
                    jobId={job.id}
                    alvo="nf_talento"
                    trilha="nf"
                    valor={jt.nf_status}
                    rotulo={`NF de ${jt.talento.nome}`}
                    talentoId={jt.talento.id}
                    podeAlterar={pode('nf_talento')}
                  />
                </Trilha>
              ))}
              {job.alvara_exigido ? (
                <Trilha titulo="Alvará" sub={job.alvara_validade ? `Válido até ${data(job.alvara_validade)}` : 'Exigido neste job'}>
                  <div className="flex flex-col items-end gap-2">
                    <StatusSelect jobId={job.id} alvo="alv" trilha="alv" valor={job.alvara_status} rotulo="Alvará" podeAlterar={pode('alv')} />
                    {/* validade: mesmo grupo que muda o status do alvará (guard_jobs) */}
                    {pode('alv') ? <ValidadeAlvara jobId={job.id} valor={job.alvara_validade} /> : null}
                  </div>
                </Trilha>
              ) : null}
              <Trilha titulo="Estratégia" sub="Só quando o talento aciona">
                <StatusSelect jobId={job.id} alvo="est" trilha="est" valor={job.est_status} rotulo="Estratégia" podeAlterar={pode('est')} />
              </Trilha>
            </ul>
          </Section>

          <Section
            titulo="Entregáveis"
            descricao={job.entregaveis.length ? `${publicadas} de ${job.entregaveis.length} publicadas` : undefined}
            acao={editaEntregas ? <NovaEntrega jobId={job.id} talentos={talentosDoJob} /> : undefined}
            semPadding
          >
            {job.entregaveis.length === 0 ? (
              <p className="px-5 py-6 text-[14px] text-muted">Nenhuma entrega cadastrada neste job.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[12.5px] text-muted">
                      <th scope="col" className="px-5 py-2.5 font-medium">Entrega</th>
                      {varios ? <th scope="col" className="px-3 py-2.5 font-medium">Talento</th> : null}
                      <th scope="col" className="px-3 py-2.5 font-medium">Rede</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Data</th>
                      <th scope="col" className={`py-2.5 text-right font-medium ${editaEntregas ? 'px-3' : 'px-5'}`}>Status</th>
                      {editaEntregas ? (
                        <th scope="col" className="w-12 py-2.5 pr-3">
                          <span className="sr-only">Ações</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {job.entregaveis.map((e) => {
                      const atrasada = e.status < ENT_PUBLICADO && diasAte(e.data_prevista, hoje) < 0
                      return (
                        <tr key={e.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-2.5 font-medium">{e.descricao}</td>
                          {varios ? <td className="px-3 py-2.5">{e.talento.nome}</td> : null}
                          <td className="px-3 py-2.5 text-muted">{e.rede}</td>
                          <td className={`tabular whitespace-nowrap px-3 py-2.5 ${atrasada ? 'font-medium text-crit' : ''}`}>
                            {data(e.data_prevista)}
                            {atrasada ? <span className="block text-[12px] font-normal">Atrasada</span> : null}
                          </td>
                          <td className={`py-2 ${editaEntregas ? 'px-3' : 'px-5'}`}>
                            <StatusSelect
                              jobId={job.id}
                              alvo="ent"
                              trilha="ent"
                              valor={e.status}
                              rotulo={e.descricao}
                              entregavelId={e.id}
                              podeAlterar={pode('ent')}
                            />
                          </td>
                          {editaEntregas ? (
                            <td className="py-2 pr-3 align-top">
                              <MenuEntrega jobId={job.id} entrega={e} talentos={talentosDoJob} podeExcluir={podeExcluirEntrega(p)} />
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section titulo="Histórico" descricao="Quem mudou o quê, do mais recente ao mais antigo.">
            {historico.length === 0 ? (
              <p className="text-[14px] text-muted">Sem alterações registradas.</p>
            ) : (
              <ol className="flex flex-col">
                {historico.map((h) => (
                  <li key={h.id} className="group relative flex gap-3 pb-4 last:pb-0">
                    <span aria-hidden="true" className="absolute bottom-0 left-[13.5px] top-8 w-px bg-line group-last:hidden" />
                    <Avatar nome={h.autor?.nome ?? 'Sistema'} foto={urlFoto(h.autor?.foto_path)} tamanho="sm" />
                    <div className="min-w-0 pt-0.5 text-[13.5px]">
                      <p className="break-words">
                        <strong className="font-medium">{h.autor?.nome ?? 'Sistema'}</strong> {descreverHistorico(h)}
                      </p>
                      <time dateTime={h.created_at} className="tabular text-[12.5px] text-muted">
                        {dataHora(h.created_at)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Ficha, valores e arquivos">
          <Section titulo="Valores">
            {valores ? (
              <>
                <dl className="flex flex-col gap-4">
                  <Numero rotulo="Valor do job" valor={valores.valor_total} destaque />
                  <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
                    <Numero rotulo="Fee da YZI" valor={valores.fee_yzi} />
                    <Numero rotulo={varios ? 'Cachê dos talentos' : 'Cachê do talento'} valor={Number(valores.valor_total) - Number(valores.fee_yzi)} />
                  </div>
                </dl>
                {valores.condicoes_pagamento ? (
                  <p className="mt-4 border-t border-line pt-4 text-[13.5px]">
                    <span className="block text-[12.5px] text-muted">Condições de pagamento</span>
                    {valores.condicoes_pagamento}
                  </p>
                ) : null}
                <p className="mt-4 text-[12.5px] text-muted">Cada parte emite a própria NF para a marca.</p>
              </>
            ) : (
              <div className="flex items-start gap-3 text-[13.5px] text-muted">
                <LockSimpleIcon aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                <p>
                  {veTodosValores(p)
                    ? 'Os valores deste job ainda não foram cadastrados.'
                    : 'Valores visíveis apenas para diretoria, diretora comercial, gerência jurídico/adm/financeiro, analistas financeiros e a analista que vendeu este job.'}
                </p>
              </div>
            )}
          </Section>

          <Section titulo="Ficha do job">
            <dl className="flex flex-col gap-3 text-[13.5px]">
              <Dado rotulo="Código"><span className="tabular">{job.codigo}</span></Dado>
              <Dado rotulo="Marca">{job.marca.nome}</Dado>
              <Dado rotulo={varios ? 'Talentos' : 'Talento'}>{job.job_talentos.map((t) => t.talento.nome).join(', ')}</Dado>
              <Dado rotulo="Redes sociais">{redes}</Dado>
              <Dado rotulo="Alvará">
                {job.alvara_exigido
                  ? `Exigido, ${rotulo('alv', job.alvara_status).toLowerCase()}${job.alvara_validade ? `, válido até ${data(job.alvara_validade)}` : ''}`
                  : 'Não exige'}
              </Dado>
              <Dado rotulo="Vendido por">{job.vendedor.nome}</Dado>
              <Dado rotulo="Atendimento">{job.atendimento?.nome ?? 'A definir'}</Dado>
              {job.observacoes ? (
                <Dado rotulo="Observações">
                  <span className="whitespace-pre-line break-words">{job.observacoes}</span>
                </Dado>
              ) : null}
            </dl>
          </Section>

          <Section titulo="Arquivos">
            {arquivos.length === 0 ? (
              <p className="text-[13.5px] text-muted">Nenhum arquivo que você possa ver neste job.</p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {arquivos.map((a) => (
                  <li key={a.id} className="flex items-center gap-1">
                    <a
                      href={`/jobs/${job.id}/arquivos/${a.id}`}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 hover:bg-sunken"
                    >
                      <FileTextIcon aria-hidden="true" size={20} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{a.nome}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {ROTULO_ARQUIVO[a.tipo]}
                          {a.talento ? `, ${a.talento.nome}` : ''}
                          {a.autor ? `. Enviado por ${a.autor.nome}` : ''}
                        </span>
                      </span>
                    </a>
                    {/* quem enviou ou a diretoria executiva (policy arquivos_delete); job encerrado não muda */}
                    {ativo && (p === 'diretoria_executiva' || a.created_by === usuario.id) ? (
                      <ExcluirArquivo jobId={job.id} id={a.id} nome={a.nome} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {ativo ? (
              <UploadArquivo jobId={job.id} talentos={job.job_talentos.map((t) => t.talento)} tipos={tiposUpload} />
            ) : (
              <p className="mt-4 border-t border-line pt-4 text-[13px] text-muted">Reabra o job para anexar arquivos.</p>
            )}
          </Section>
        </aside>
      </div>
    </>
  )
}

function Trilha({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{titulo}</p>
        <p className="truncate text-[12.5px] text-muted">{sub}</p>
      </div>
      {children}
    </li>
  )
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Numero({ rotulo, valor, destaque = false }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted">{rotulo}</dt>
      <dd className={`tabular font-semibold tracking-[-0.01em] ${destaque ? 'text-[24px]' : 'text-[16px]'}`}>{brl(valor)}</dd>
    </div>
  )
}
