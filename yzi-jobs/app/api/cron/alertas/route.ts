import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Perfil } from '@/lib/perfis'
import type { Alerta } from '@/types/dominio'

export const dynamic = 'force-dynamic'

// Quem recebe cada área. A diretoria executiva recebe tudo;
// alertas do Comercial vão para a diretora comercial e para quem vendeu o job.
const DESTINO: Record<Alerta['area'], Perfil[]> = {
  juridico: ['gerente_jaf', 'analista_juridico_adm'],
  financeiro: ['gerente_jaf', 'analista_financeiro'],
  atendimento: ['gerencia_atendimento', 'analista_atendimento'],
  comercial: ['diretora_comercial'],
}

type Pessoa = { id: string; nome: string; email: string; perfil: Perfil }
type JobMini = { id: string; codigo: string; vendido_por: string; marca: { nome: string }; job_talentos: { talento: { nome: string } }[] }

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const [alertasR, pessoasR] = await Promise.all([
    admin.from('v_alertas').select('*'),
    admin.from('profiles').select('id, nome, email, perfil').eq('ativo', true),
  ])
  if (alertasR.error || pessoasR.error) return NextResponse.json({ erro: 'falha ao ler dados' }, { status: 500 })

  const alertas = alertasR.data as Alerta[]
  if (alertas.length === 0) return NextResponse.json({ enviados: 0 })

  const { data: jobsData } = await admin
    .from('jobs')
    .select('id, codigo, vendido_por, marca:marcas(nome), job_talentos(talento:talentos(nome))')
    .in('id', [...new Set(alertas.map((a) => a.job_id))])
  const jobs = new Map(((jobsData ?? []) as unknown as JobMini[]).map((j) => [j.id, j]))
  const pessoas = pessoasR.data as Pessoa[]

  // agrupa por destinatário
  const porPessoa = new Map<string, { pessoa: Pessoa; itens: Alerta[] }>()
  const incluir = (p: Pessoa, a: Alerta) => {
    const atual = porPessoa.get(p.id) ?? { pessoa: p, itens: [] }
    atual.itens.push(a)
    porPessoa.set(p.id, atual)
  }
  for (const a of alertas) {
    const job = jobs.get(a.job_id)
    for (const p of pessoas) {
      const recebe =
        p.perfil === 'diretoria_executiva' ||
        DESTINO[a.area].includes(p.perfil) ||
        (a.area === 'comercial' && job?.vendido_por === p.id)
      if (recebe) incluir(p, a)
    }
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL
  const nomeJob = (j?: JobMini) => (j ? `${j.job_talentos.map((t) => t.talento.nome).join(' + ')} × ${j.marca.nome} (${j.codigo})` : 'Job')
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

  // Os e-mails não trazem valores: as descrições dos alertas não contêm números financeiros.
  const emails = [...porPessoa.values()].map(({ pessoa, itens }) => ({
    from: process.env.ALERTAS_FROM!,
    to: pessoa.email,
    subject: `YZI Jobs: ${itens.length} ${itens.length === 1 ? 'alerta aberto' : 'alertas abertos'}`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#18181b">
      <p>Oi, ${esc(pessoa.nome.split(' ')[0])}. Estes jobs precisam de atenção hoje:</p>
      <ul>${itens
        .map((a) => `<li style="margin-bottom:8px"><strong>${esc(a.descricao)}</strong><br>
          <a href="${site}/jobs/${a.job_id}" style="color:#2b4acb">${esc(nomeJob(jobs.get(a.job_id)))}</a></li>`)
        .join('')}</ul>
      <p><a href="${site}/alertas" style="color:#2b4acb">Ver todos os alertas</a></p></div>`,
  }))

  const resend = new Resend(process.env.RESEND_API_KEY)
  let enviados = 0
  for (let i = 0; i < emails.length; i += 100) {
    const lote = emails.slice(i, i + 100)
    const { error } = await resend.batch.send(lote)
    if (!error) enviados += lote.length
  }
  return NextResponse.json({ enviados, alertas: alertas.length })
}
