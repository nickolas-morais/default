import { NextResponse, type NextRequest } from 'next/server'
import { getSessao } from '@/lib/sessao'

// Download: o RLS de "arquivos" e do Storage decide se a pessoa pode baixar.
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string; arquivoId: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return new NextResponse('Não autenticado', { status: 401 })
  const { id, arquivoId } = await ctx.params

  const { data: arquivo } = await sessao.supabase
    .from('arquivos')
    .select('storage_path, nome')
    .eq('id', arquivoId)
    .eq('job_id', id)
    .maybeSingle()
  if (!arquivo) return new NextResponse('Arquivo não encontrado', { status: 404 })

  const { data } = await sessao.supabase.storage
    .from('arquivos')
    .createSignedUrl(arquivo.storage_path, 60, { download: arquivo.nome })
  if (!data?.signedUrl) return new NextResponse('Sem permissão', { status: 403 })
  return NextResponse.redirect(data.signedUrl)
}
