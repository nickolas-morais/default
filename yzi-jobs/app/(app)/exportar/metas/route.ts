import { gerarCsv, respostaCsv } from '@/lib/csv'
import { hojeSP } from '@/lib/format'
import { carregarMetas, percentual } from '@/lib/metas'
import { veAlgumValor } from '@/lib/perfis'
import { getSessao } from '@/lib/sessao'

// Exporta meta x vendido do ano (?ano=). O RLS limita: a analista só recebe a própria linha.
export async function GET(request: Request) {
  const sessao = await getSessao()
  if (!sessao) return new Response('Sessão expirada', { status: 401 })
  if (!veAlgumValor(sessao.usuario.perfil)) return new Response('Metas são restritas a quem tem alçada', { status: 403 })

  const anoPedido = Number(new URL(request.url).searchParams.get('ano'))
  const ano = Number.isInteger(anoPedido) && anoPedido >= 2020 && anoPedido <= 2100 ? anoPedido : new Date().getFullYear()
  const linhas = await carregarMetas(sessao.supabase, ano)

  const csv = gerarCsv(
    ['Analista', 'Ano', 'Meta (R$)', 'Vendido (R$)', 'Atingido (%)', 'Jobs'],
    linhas.map((l) => [l.nome, String(ano), l.meta, l.total, percentual(l.total, l.meta), String(l.jobs)]),
  )
  return respostaCsv(`metas-${ano}`, csv, hojeSP())
}
