import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheckIcon } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/ui/pill'
import { EmptyState } from '@/components/ui/section'
import { data, diasAte, hojeSP, plural } from '@/lib/format'
import { exigirSessao } from '@/lib/sessao'
import { ENT_PUBLICADO } from '@/lib/status'

export const metadata: Metadata = { title: 'Agenda de entregas' }

type Item = {
  id: string
  descricao: string
  rede: string
  data_prevista: string
  status: number
  talento: { nome: string }
  job: { id: string; codigo: string; marca: { nome: string } }
}

const GRUPOS = [
  { chave: 'atrasadas', titulo: 'Atrasadas', ate: -1 },
  { chave: 'hoje', titulo: 'Hoje', ate: 0 },
  { chave: 'semana', titulo: 'Próximos 7 dias', ate: 7 },
  { chave: 'depois', titulo: 'Mais adiante', ate: Infinity },
] as const

export default async function AgendaPage() {
  const { supabase } = await exigirSessao()
  const { data: linhas, error } = await supabase
    .from('entregaveis')
    // !inner + filtro: entregas de job finalizado ou cancelado saem da agenda
    .select('id, descricao, rede, data_prevista, status, talento:talentos(nome), job:jobs!inner(id, codigo, marca:marcas(nome))')
    .eq('job.situacao', 'ativo')
    .lt('status', ENT_PUBLICADO)
    .order('data_prevista')
    .limit(500)
  if (error) throw error
  const itens = (linhas ?? []) as unknown as Item[]
  const hoje = hojeSP()

  // A lista já vem ordenada por data; cada item cai no primeiro grupo cujo limite alcança.
  const porGrupo = new Map<string, { item: Item; dias: number }[]>()
  for (const item of itens) {
    const dias = diasAte(item.data_prevista, hoje)
    const grupo = GRUPOS.find((g) => dias <= g.ate)!
    const lista = porGrupo.get(grupo.chave)
    if (lista) lista.push({ item, dias })
    else porGrupo.set(grupo.chave, [{ item, dias }])
  }

  return (
    <>
      <PageHeader titulo="Agenda de entregas" descricao="Tudo o que ainda não foi publicado, da data mais próxima para a mais distante." />
      {itens.length === 0 ? (
        <EmptyState titulo="Nenhuma entrega pendente" icone={CalendarCheckIcon}>
          As entregas dos jobs aparecem aqui até serem publicadas.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          {GRUPOS.map((g) => {
            const lista = porGrupo.get(g.chave)
            if (!lista) return null
            return (
              <section key={g.chave} aria-labelledby={`grupo-${g.chave}`}>
                <h2 id={`grupo-${g.chave}`} className="mb-2.5 flex items-baseline gap-2 text-[14.5px] font-semibold">
                  <span className={g.chave === 'atrasadas' ? 'text-crit' : ''}>{g.titulo}</span>
                  <span className="tabular text-[13px] font-normal text-muted">{plural(lista.length, 'entrega', 'entregas')}</span>
                </h2>
                <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
                  {lista.map(({ item: e, dias }) => (
                    <li key={e.id}>
                      <Link
                        href={`/jobs/${e.job.id}`}
                        className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-sunken/60 sm:grid-cols-[96px_minmax(0,1fr)_auto]"
                      >
                        <span className="tabular">
                          <span className={`block text-[13.5px] font-medium ${dias < 0 ? 'text-crit' : ''}`}>{data(e.data_prevista)}</span>
                          <span className="block text-[12px] text-muted">{quando(dias)}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{e.descricao}</span>
                          <span className="block truncate text-[12.5px] text-muted">
                            {e.talento.nome} × {e.job.marca.nome}, {e.rede}
                          </span>
                        </span>
                        <span className="col-start-2 sm:col-start-auto">
                          <StatusPill trilha="ent" valor={e.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

function quando(d: number) {
  if (d < 0) return `${-d} ${d === -1 ? 'dia' : 'dias'} atrás`
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  return `em ${d} dias`
}
