/**
 * Importa a planilha de status atual (exportada em CSV) para o sistema.
 *
 * Uso:
 *   node --env-file=.env.local --experimental-strip-types scripts/importar-planilha.mts planilha.csv --simular
 *   node --env-file=.env.local --experimental-strip-types scripts/importar-planilha.mts planilha.csv
 *
 * Formato: uma linha por ENTREGÁVEL. Linhas com o mesmo valor na coluna "job" formam um job.
 * Separador "," ou ";" (detectado automaticamente). Colunas esperadas (cabeçalho):
 *   job, marca, talentos, vendido_por_email, atendimento_email, vigencia_inicio, vigencia_fim,
 *   alvara, alvara_status, juridico, administrativo, nf_yzi, nf_talento, estrategia,
 *   valor_total, fee_yzi, condicoes_pagamento,
 *   entrega, entrega_talento, rede, data_entrega, status_entrega
 * Datas em dd/mm/aaaa. Status escritos como na tela (ex.: "Assinado", "Publicado").
 * "talentos" separados por "+" (ex.: "Tara + Yasmin Castillo").
 * Gera importacao-relatorio.csv com as linhas que não puderam ser importadas.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { ETAPAS } from '../lib/status.ts'

const [arquivo, ...flags] = process.argv.slice(2)
const simular = flags.includes('--simular')
if (!arquivo) {
  console.error('Informe o arquivo CSV. Ex.: ... importar-planilha.mts planilha.csv --simular')
  process.exit(1)
}

// ---------- CSV ----------
function lerCSV(texto: string): Record<string, string>[] {
  const limpo = texto.replace(/^\uFEFF/, '')
  const sep = (limpo.split('\n')[0].match(/;/g)?.length ?? 0) > (limpo.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpo[i + 1] === '\n') i++
      linha.push(campo); campo = ''
      if (linha.some((x) => x.trim())) linhas.push(linha)
      linha = []
    } else campo += c
  }
  linha.push(campo)
  if (linha.some((x) => x.trim())) linhas.push(linha)
  const [cab, ...resto] = linhas
  const chaves = cab.map((h) => h.trim().toLowerCase())
  return resto.map((l) => Object.fromEntries(chaves.map((k, i) => [k, (l[i] ?? '').trim()])))
}

// ---------- conversões ----------
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
function status(trilha: keyof typeof ETAPAS, valor: string): number {
  if (!valor) return 0
  const i = ETAPAS[trilha].findIndex((e) => norm(e) === norm(valor))
  if (i < 0) throw new Error(`status "${valor}" não existe em ${trilha} (${ETAPAS[trilha].join(' / ')})`)
  return i
}
function dataBR(v: string): string {
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) throw new Error(`data inválida "${v}" (use dd/mm/aaaa)`)
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}
const dinheiro = (v: string) => {
  const n = Number(v.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) throw new Error(`valor inválido "${v}"`)
  return n
}
const simNao = (v: string) => ['sim', 's', 'x', 'true', '1'].includes(norm(v))

// ---------- importação ----------
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const linhas = lerCSV(readFileSync(arquivo, 'utf8'))
const grupos = Map.groupBy(linhas, (l) => l.job)
console.log(`${linhas.length} linhas, ${grupos.size} jobs${simular ? ' (simulação: nada será gravado)' : ''}`)

const [{ data: pessoas }, { data: talentos }, { data: marcas }] = await Promise.all([
  sb.from('profiles').select('id, email'),
  sb.from('talentos').select('id, nome'),
  sb.from('marcas').select('id, nome'),
])
const pessoaPorEmail = new Map((pessoas ?? []).map((p) => [p.email.toLowerCase(), p.id as string]))
const talentoPorNome = new Map((talentos ?? []).map((t) => [norm(t.nome), t.id as string]))
const marcaPorNome = new Map((marcas ?? []).map((m) => [norm(m.nome), m.id as string]))

async function idTalento(nome: string) {
  const achado = talentoPorNome.get(norm(nome))
  if (achado) return achado
  if (simular) return `novo:${nome}`
  const { data, error } = await sb.from('talentos').insert({ nome: nome.trim() }).select('id').single()
  if (error) throw new Error(`talento "${nome}": ${error.message}`)
  talentoPorNome.set(norm(nome), data.id)
  return data.id as string
}
async function idMarca(nome: string) {
  const achado = marcaPorNome.get(norm(nome))
  if (achado) return achado
  if (simular) return `nova:${nome}`
  const { data, error } = await sb.from('marcas').insert({ nome: nome.trim() }).select('id').single()
  if (error) throw new Error(`marca "${nome}": ${error.message}`)
  marcaPorNome.set(norm(nome), data.id)
  return data.id as string
}

const falhas: { job: string; motivo: string }[] = []
let importados = 0

for (const [chave, rows] of grupos) {
  const r = rows[0]
  try {
    if (!chave) throw new Error('linha sem a coluna "job" preenchida')
    const vendedor = pessoaPorEmail.get(r.vendido_por_email?.toLowerCase())
    if (!vendedor) throw new Error(`vendido_por_email "${r.vendido_por_email}" não é um usuário cadastrado`)
    const atendimento = r.atendimento_email ? pessoaPorEmail.get(r.atendimento_email.toLowerCase()) : undefined
    if (r.atendimento_email && !atendimento) throw new Error(`atendimento_email "${r.atendimento_email}" não cadastrado`)

    const nomes = r.talentos.split('+').map((s) => s.trim()).filter(Boolean)
    if (!nomes.length) throw new Error('sem talentos')
    const job = {
      vigencia_inicio: dataBR(r.vigencia_inicio),
      vigencia_fim: dataBR(r.vigencia_fim),
      alvara_exigido: simNao(r.alvara),
      alvara_status: status('alv', r.alvara_status),
      jur_status: status('jur', r.juridico),
      adm_status: status('adm', r.administrativo),
      nf_yzi_status: status('nf', r.nf_yzi),
      est_status: status('est', r.estrategia),
      vendido_por: vendedor,
      atendimento_id: atendimento ?? null,
    }
    const nfTalento = status('nf', r.nf_talento)
    const entregas = rows
      .filter((x) => x.entrega)
      .map((x, i) => ({
        descricao: x.entrega,
        talento: x.entrega_talento || nomes[0],
        rede: x.rede || 'Instagram',
        data_prevista: dataBR(x.data_entrega),
        status: status('ent', x.status_entrega),
        ordem: i,
      }))
    for (const e of entregas) if (!nomes.some((n) => norm(n) === norm(e.talento))) throw new Error(`entrega "${e.descricao}" é de um talento fora do job`)
    const valores = r.valor_total ? { valor_total: dinheiro(r.valor_total), fee_yzi: dinheiro(r.fee_yzi || '0'), condicoes_pagamento: r.condicoes_pagamento || null } : null

    if (simular) { importados++; continue }

    const marca_id = await idMarca(r.marca)
    const ids = await Promise.all(nomes.map(idTalento))
    const { data: novo, error } = await sb.from('jobs').insert({ ...job, marca_id }).select('id').single()
    if (error) throw new Error(error.message)
    try {
      const e1 = await sb.from('job_talentos').insert(ids.map((talento_id) => ({ job_id: novo.id, talento_id, nf_status: nfTalento })))
      if (e1.error) throw new Error(e1.error.message)
      if (entregas.length) {
        const idPorNome = new Map(nomes.map((n, i) => [norm(n), ids[i]]))
        const e2 = await sb.from('entregaveis').insert(
          entregas.map(({ talento, ...e }) => ({ ...e, job_id: novo.id, talento_id: idPorNome.get(norm(talento)) })),
        )
        if (e2.error) throw new Error(e2.error.message)
      }
      if (valores) {
        const e3 = await sb.from('job_valores').insert({ ...valores, job_id: novo.id })
        if (e3.error) throw new Error(e3.error.message)
      }
    } catch (e) {
      await sb.from('jobs').delete().eq('id', novo.id) // desfaz o job incompleto
      throw e
    }
    importados++
  } catch (e) {
    falhas.push({ job: chave, motivo: (e as Error).message })
  }
}

console.log(`${importados} jobs ${simular ? 'válidos' : 'importados'}, ${falhas.length} com problema`)
if (falhas.length) {
  writeFileSync('importacao-relatorio.csv', 'job;motivo\n' + falhas.map((f) => `${f.job};"${f.motivo.replace(/"/g, '""')}"`).join('\n'))
  console.log('Detalhes em importacao-relatorio.csv')
}
