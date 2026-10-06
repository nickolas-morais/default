import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LinhaMeta = { id: string; nome: string; fotoPath: string | null; meta: number; total: number; jobs: number }

/**
 * Meta x vendido de cada analista no ano (tela de Metas e exportação).
 * O RLS já limita: a analista só recebe a própria meta e as próprias vendas.
 */
export async function carregarMetas(supabase: SupabaseClient, ano: number): Promise<LinhaMeta[]> {
  const [metas, vendas, pessoas] = await Promise.all([
    supabase.from('metas').select('analista_id, valor').eq('ano', ano),
    supabase.from('v_vendas_analista').select('analista_id, jobs, valor_vendido').eq('ano', ano),
    supabase.from('profiles').select('id, nome, foto_path'),
  ])
  const pessoa = new Map((pessoas.data ?? []).map((p) => [p.id as string, p as { nome: string; foto_path: string | null }]))
  const vendido = new Map((vendas.data ?? []).map((v) => [v.analista_id as string, v]))
  return (metas.data ?? [])
    .map((m) => {
      const v = vendido.get(m.analista_id)
      const p = pessoa.get(m.analista_id)
      return {
        id: m.analista_id as string,
        nome: p?.nome ?? '—',
        fotoPath: p?.foto_path ?? null,
        meta: Number(m.valor),
        total: Number(v?.valor_vendido ?? 0),
        jobs: Number(v?.jobs ?? 0),
      }
    })
    .toSorted((a, b) => b.total / (b.meta || 1) - a.total / (a.meta || 1))
}

export function percentual(total: number, meta: number) {
  return meta ? Math.round((total / meta) * 1000) / 10 : 0
}
