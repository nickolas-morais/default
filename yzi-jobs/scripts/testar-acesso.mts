/**
 * Testa as regras de acesso no banco de verdade (RLS, triggers e funções), entrando como
 * um usuário de cada perfil. Cria dados marcados com "[teste]" e apaga tudo no fim.
 *
 * Uso (de preferência no projeto de homologação):
 *   node --env-file=.env.local --experimental-strip-types scripts/testar-acesso.mts --confirmar
 *
 * Sai com código 1 se alguma regra não se comportar como esperado.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!URL || !ANON || !SERVICE) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
if (!process.argv.includes('--confirmar')) {
  console.error(`Este teste cria e apaga dados "[teste]" no projeto:\n  ${URL}\nRode de novo com --confirmar para continuar.`)
  process.exit(1)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
const PERFIS = [
  'diretoria_executiva',
  'diretora_comercial',
  'analista_comercial',
  'gerente_jaf',
  'analista_financeiro',
  'analista_juridico_adm',
  'diretora_estrategica',
  'gerencia_atendimento',
  'analista_atendimento',
] as const
type Perfil = (typeof PERFIS)[number]

const SENHA = `Teste-${crypto.randomUUID()}`
const emailDe = (p: string) => `yzi-teste+${p.replace(/_/g, '-')}@example.com`
const MARCA = '[teste] Marca'
const TALENTO = '[teste] Talento'

const ids: { usuarios: Partial<Record<Perfil, string>>; outraAnalista?: string; marca?: string; talento?: string; jobA?: string; jobB?: string; entrega?: string } = {
  usuarios: {},
}
const sessoes = new Map<string, SupabaseClient>()
let falhas = 0

function ok(descricao: string, passou: boolean, detalhe = '') {
  if (!passou) falhas++
  console.log(`${passou ? '  ✓' : '  ✗'} ${descricao}${!passou && detalhe ? `  (${detalhe})` : ''}`)
}

async function exigir<T>(passo: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(`${passo}: ${error.message}`)
  return data
}

// ---------- Preparação ----------

async function limpar() {
  // jobs de teste levam junto talentos do job, entregas, valores e histórico (on delete cascade)
  const { data: marcas } = await admin.from('marcas').select('id').like('nome', '[teste]%')
  for (const m of marcas ?? []) await admin.from('jobs').delete().eq('marca_id', m.id)
  await admin.from('talentos').delete().like('nome', '[teste]%')
  await admin.from('marcas').delete().like('nome', '[teste]%')
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data?.users ?? []) if (u.email?.startsWith('yzi-teste+')) await admin.auth.admin.deleteUser(u.id)
}

async function criarUsuario(chave: string, perfil: Perfil) {
  const { data, error } = await admin.auth.admin.createUser({ email: emailDe(chave), password: SENHA, email_confirm: true })
  if (error || !data.user) throw new Error(`criar usuário ${chave}: ${error?.message}`)
  await exigir(`perfil ${chave}`, admin.from('profiles').insert({ id: data.user.id, nome: `[teste] ${chave}`, email: emailDe(chave), perfil }))
  return data.user.id
}

async function preparar() {
  await limpar()
  for (const p of PERFIS) ids.usuarios[p] = await criarUsuario(p, p)
  // segunda analista comercial: dona do job B (para testar "só os jobs que vendeu")
  ids.outraAnalista = await criarUsuario('outra-analista', 'analista_comercial')

  ids.marca = (await exigir('marca', admin.from('marcas').insert({ nome: MARCA }).select('id').single())).id
  ids.talento = (await exigir('talento', admin.from('talentos').insert({ nome: TALENTO }).select('id').single())).id
  const job = (vendido_por: string) => ({
    marca_id: ids.marca,
    vigencia_inicio: '2026-01-01',
    vigencia_fim: '2026-12-31',
    vendido_por,
  })
  ids.jobA = (await exigir('job A', admin.from('jobs').insert(job(ids.usuarios.analista_comercial!)).select('id').single())).id
  ids.jobB = (await exigir('job B', admin.from('jobs').insert(job(ids.outraAnalista)).select('id').single())).id
  for (const j of [ids.jobA, ids.jobB]) {
    await exigir('talento do job', admin.from('job_talentos').insert({ job_id: j, talento_id: ids.talento }))
    await exigir('valores', admin.from('job_valores').insert({ job_id: j, valor_total: 100000, fee_yzi: 20000 }))
  }
  ids.entrega = (
    await exigir(
      'entrega',
      admin
        .from('entregaveis')
        .insert({ job_id: ids.jobA, talento_id: ids.talento, descricao: '[teste] Reels', rede: 'Instagram', data_prevista: '2026-06-01' })
        .select('id')
        .single(),
    )
  ).id
}

async function como(perfil: string): Promise<SupabaseClient> {
  const pronta = sessoes.get(perfil)
  if (pronta) return pronta
  const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await sb.auth.signInWithPassword({ email: emailDe(perfil), password: SENHA })
  if (error) throw new Error(`login ${perfil}: ${error.message}`)
  sessoes.set(perfil, sb)
  return sb
}

/** Tenta uma alteração como `perfil`; devolve true se o banco aceitou (linha voltou alterada). */
async function consegue(perfil: string, tabela: string, mudanca: Record<string, unknown>, filtro: Record<string, string>) {
  const sb = await como(perfil)
  let q = sb.from(tabela).update(mudanca)
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v)
  const { data, error } = await q.select()
  return { aceitou: !error && (data?.length ?? 0) > 0, erro: error?.message }
}

/** Volta o campo ao valor original (como service role) para o próximo teste partir do mesmo estado. */
async function restaurar(tabela: string, valores: Record<string, unknown>, filtro: Record<string, string>) {
  let q = admin.from(tabela).update(valores)
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v)
  await exigir(`restaurar ${tabela}`, q)
}

// ---------- Testes ----------

async function testarValores() {
  console.log('\nValores dos jobs (job A vendido pela analista comercial de teste; job B por outra analista)')
  const veTodos: Perfil[] = ['diretoria_executiva', 'diretora_comercial', 'gerente_jaf', 'analista_financeiro']
  for (const p of PERFIS) {
    const sb = await como(p)
    const { data } = await sb.from('job_valores').select('job_id').in('job_id', [ids.jobA!, ids.jobB!])
    const vistos = new Set((data ?? []).map((v) => v.job_id))
    const esperadoA = veTodos.includes(p) || p === 'analista_comercial'
    const esperadoB = veTodos.includes(p)
    ok(
      `${p.padEnd(22)} vê A: ${esperadoA ? 'sim' : 'não'} / vê B: ${esperadoB ? 'sim' : 'não'}`,
      vistos.has(ids.jobA) === esperadoA && vistos.has(ids.jobB) === esperadoB,
      `viu A: ${vistos.has(ids.jobA)}, viu B: ${vistos.has(ids.jobB)}`,
    )
  }
}

async function testarTrilhas() {
  console.log('\nQuem altera cada trilha')
  const casos: { campo: string; valor: number; pode: Perfil[]; nao: Perfil[] }[] = [
    { campo: 'jur_status', valor: 1, pode: ['gerente_jaf', 'analista_juridico_adm'], nao: ['analista_atendimento', 'analista_financeiro'] },
    { campo: 'nf_yzi_status', valor: 1, pode: ['analista_financeiro', 'gerente_jaf'], nao: ['analista_comercial', 'analista_juridico_adm'] },
    { campo: 'est_status', valor: 1, pode: ['diretora_estrategica'], nao: ['gerente_jaf', 'diretora_comercial'] },
  ]
  for (const c of casos) {
    for (const p of [...c.pode, ...c.nao]) {
      const r = await consegue(p, 'jobs', { [c.campo]: c.valor }, { id: ids.jobA! })
      const esperado = c.pode.includes(p)
      ok(`${c.campo.padEnd(14)} ${p.padEnd(22)} ${esperado ? 'altera' : 'bloqueado'}`, r.aceitou === esperado, r.erro)
      if (r.aceitou) await restaurar('jobs', { [c.campo]: 0 }, { id: ids.jobA! })
    }
  }

  console.log('\nStatus das entregas (só o Atendimento)')
  for (const [p, esperado] of [
    ['analista_atendimento', true],
    ['gerencia_atendimento', true],
    ['analista_comercial', false],
    ['gerente_jaf', false],
  ] as const) {
    const r = await consegue(p, 'entregaveis', { status: 1 }, { id: ids.entrega! })
    ok(`entrega ${p.padEnd(22)} ${esperado ? 'altera' : 'bloqueado'}`, r.aceitou === esperado, r.erro)
    if (r.aceitou) await restaurar('entregaveis', { status: 0 }, { id: ids.entrega! })
  }

  console.log('\nNF do talento (Financeiro)')
  for (const [p, esperado] of [
    ['analista_financeiro', true],
    ['analista_comercial', false],
  ] as const) {
    const r = await consegue(p, 'job_talentos', { nf_status: 1 }, { job_id: ids.jobA!, talento_id: ids.talento! })
    ok(`nf_talento ${p.padEnd(22)} ${esperado ? 'altera' : 'bloqueado'}`, r.aceitou === esperado, r.erro)
    if (r.aceitou) await restaurar('job_talentos', { nf_status: 0 }, { job_id: ids.jobA!, talento_id: ids.talento! })
  }
}

async function testarSituacao() {
  console.log('\nFinalizar/cancelar (Comercial responsável) e trava de job encerrado')
  // analista que vendeu o job A pode cancelar; o job B não é dela
  let r = await consegue('analista_comercial', 'jobs', { situacao: 'cancelado', motivo_cancelamento: '[teste]' }, { id: ids.jobA! })
  ok('analista comercial cancela o próprio job', r.aceitou, r.erro)
  const travado = await consegue('gerente_jaf', 'jobs', { jur_status: 1 }, { id: ids.jobA! })
  ok('job cancelado não aceita mudança de trilha', !travado.aceitou, travado.erro)
  await restaurar('jobs', { situacao: 'ativo', jur_status: 0 }, { id: ids.jobA! })

  r = await consegue('analista_comercial', 'jobs', { situacao: 'cancelado', motivo_cancelamento: '[teste]' }, { id: ids.jobB! })
  ok('analista comercial NÃO cancela job de outra analista', !r.aceitou, r.erro)
  if (r.aceitou) await restaurar('jobs', { situacao: 'ativo' }, { id: ids.jobB! })

  r = await consegue('diretora_comercial', 'jobs', { situacao: 'cancelado' }, { id: ids.jobB! })
  ok('cancelar sem motivo é recusado', !r.aceitou, r.erro)
  if (r.aceitou) await restaurar('jobs', { situacao: 'ativo' }, { id: ids.jobB! })

  r = await consegue('gerente_jaf', 'jobs', { situacao: 'finalizado' }, { id: ids.jobA! })
  ok('jurídico NÃO finaliza job', !r.aceitou, r.erro)
  if (r.aceitou) await restaurar('jobs', { situacao: 'ativo' }, { id: ids.jobA! })
}

async function testarGestao() {
  console.log('\nCadastros e usuários')
  let r = await consegue('analista_comercial', 'profiles', { nome: '[teste] invadido' }, { id: ids.usuarios.analista_atendimento! })
  ok('analista NÃO altera cadastro de outra pessoa', !r.aceitou, r.erro)
  r = await consegue('diretoria_executiva', 'profiles', { nome: '[teste] analista_atendimento' }, { id: ids.usuarios.analista_atendimento! })
  ok('diretoria executiva altera cadastro de usuário', r.aceitou, r.erro)

  r = await consegue('analista_atendimento', 'talentos', { redes: '[teste]' }, { id: ids.talento! })
  ok('atendimento NÃO altera talento', !r.aceitou, r.erro)
  r = await consegue('analista_comercial', 'talentos', { redes: '[teste]' }, { id: ids.talento! })
  ok('comercial altera talento', r.aceitou, r.erro)

  // remover talento com NF andando é recusado (guard_remover_talento); job B tem um talento só, então
  // cria um segundo talento no job A para isolar a regra da NF da regra "pelo menos um talento"
  const t2 = (await exigir('talento 2', admin.from('talentos').insert({ nome: '[teste] Talento 2' }).select('id').single())).id
  await exigir('talento 2 no job', admin.from('job_talentos').insert({ job_id: ids.jobA, talento_id: t2, nf_status: 1 }))
  const sb = await como('analista_comercial')
  const { data: removido } = await sb.from('job_talentos').delete().eq('job_id', ids.jobA!).eq('talento_id', t2).select()
  ok('talento com NF emitida NÃO sai do job', !removido?.length)
}

// ---------- Ataques diretos à API (sem passar pelas telas) ----------
// Quem conhece o sistema pode chamar o Supabase direto com a chave pública e a própria sessão.
// Cada caso abaixo é uma tentativa de burlar as regras; todos devem ser recusados pelo banco.

const PDF_FALSO = new Blob(['%PDF-1.4 [teste]'], { type: 'application/pdf' })

async function testarAtaques() {
  console.log('\nAtaques sem login (só a chave pública, que fica no navegador)')
  const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  for (const tabela of ['profiles', 'jobs', 'job_valores', 'metas', 'historico', 'historico_equipe', 'arquivos', 'talentos', 'marcas', 'entregaveis', 'job_talentos']) {
    const { data } = await anon.from(tabela).select('*').limit(1)
    ok(`sem login não lê ${tabela}`, !data?.length)
  }
  for (const view of ['v_alertas', 'v_vendas_analista']) {
    const { data } = await anon.from(view).select('*').limit(1)
    ok(`sem login não lê ${view}`, !data?.length)
  }
  const rpc = await anon.rpc('criar_job', { p: {} })
  ok('sem login não chama criar_job', Boolean(rpc.error))
  const ins = await anon.from('marcas').insert({ nome: '[teste] invasão' }).select()
  ok('sem login não grava', !ins.data?.length)

  // arquivo do job B (da outra analista): contrato privado
  const caminhoB = `${ids.jobB}/contrato/${crypto.randomUUID()}.pdf`
  await exigir('upload contrato B', admin.storage.from('arquivos').upload(caminhoB, PDF_FALSO, { contentType: 'application/pdf' }))
  await exigir('registro contrato B', admin.from('arquivos').insert({ job_id: ids.jobB, tipo: 'contrato', storage_path: caminhoB, nome: '[teste] contrato.pdf' }))
  const assinado = await anon.storage.from('arquivos').createSignedUrl(caminhoB, 60)
  ok('sem login não gera link do contrato', !assinado.data?.signedUrl)

  console.log('\nAtaques de uma analista comercial (sessão válida, mas sem direito ao dado)')
  const sb = await como('analista_comercial')
  const eu = ids.usuarios.analista_comercial!

  // IDOR: trocar o id na requisição
  const vB = await sb.from('job_valores').select('valor_total').eq('job_id', ids.jobB!)
  ok('IDOR: não lê valores do job de outra analista pelo id', !vB.data?.length)
  const linkB = await sb.storage.from('arquivos').createSignedUrl(caminhoB, 60)
  ok('IDOR: não baixa contrato do job de outra analista', !linkB.data?.signedUrl)
  const metasOutras = await sb.from('metas').select('*').neq('analista_id', eu)
  ok('não lê metas de outras analistas', !metasOutras.data?.length)
  const hist = await sb.from('historico_equipe').select('*').limit(1)
  ok('não lê o histórico da equipe (só diretoria)', !hist.data?.length)

  // Escalada de privilégio: mandar campos que a tela não manda
  let r = await consegue('analista_comercial', 'profiles', { perfil: 'diretoria_executiva' }, { id: eu })
  ok('não se promove a diretoria (perfil)', !r.aceitou, r.erro)
  r = await consegue('analista_comercial', 'jobs', { vendido_por: eu }, { id: ids.jobB! })
  ok('não "rouba" o job de outra analista (vendido_por)', !r.aceitou, r.erro)
  if (r.aceitou) await restaurar('jobs', { vendido_por: ids.outraAnalista }, { id: ids.jobB! })
  r = await consegue('analista_comercial', 'job_valores', { valor_total: 1 }, { job_id: ids.jobB! })
  ok('não altera valores do job de outra analista', !r.aceitou, r.erro)

  // Adulteração na criação: campos de outras áreas já preenchidos
  const forjado = await sb
    .from('jobs')
    .insert({
      marca_id: ids.marca,
      vigencia_inicio: '2026-01-01',
      vigencia_fim: '2026-12-31',
      vendido_por: eu,
      jur_status: 3,
      nf_yzi_status: 3,
      situacao: 'finalizado',
      codigo: 'J-FORJADO',
      created_by: ids.usuarios.diretoria_executiva,
    })
    .select('id, jur_status, nf_yzi_status, situacao, codigo, created_by')
    .maybeSingle()
  const j = forjado.data
  ok(
    'criar job não aceita status de outras áreas, situação, código nem autor forjados',
    !j || (j.jur_status === 0 && j.nf_yzi_status === 0 && j.situacao === 'ativo' && j.codigo !== 'J-FORJADO' && j.created_by === eu),
    j ? JSON.stringify(j) : forjado.error?.message,
  )
  const jobDela = j?.id ?? ids.jobA!
  const t3 = (await exigir('talento 3', admin.from('talentos').insert({ nome: '[teste] Talento 3' }).select('id').single())).id
  const nfForjada = await sb.from('job_talentos').insert({ job_id: jobDela, talento_id: t3, nf_status: 3 }).select('nf_status').maybeSingle()
  ok('incluir talento não aceita NF já "Paga"', !nfForjada.data || nfForjada.data.nf_status === 0, JSON.stringify(nfForjada.data ?? nfForjada.error?.message))
  const entForjada = await sb
    .from('entregaveis')
    .insert({ job_id: ids.jobA, talento_id: ids.talento, descricao: '[teste] forjada', rede: 'Instagram', data_prevista: '2026-06-01', status: 4 })
    .select('status')
    .maybeSingle()
  ok('comercial não cria entrega já "Publicada"', !entForjada.data || entForjada.data.status === 0, JSON.stringify(entForjada.data ?? entForjada.error?.message))
  const vendaAlheia = await sb
    .from('jobs')
    .insert({ marca_id: ids.marca, vigencia_inicio: '2026-01-01', vigencia_fim: '2026-12-31', vendido_por: ids.outraAnalista })
    .select('id')
  ok('não cria job em nome de outra analista', !vendaAlheia.data?.length, vendaAlheia.error?.message)

  // Arquivos: apontar um registro do próprio job para a pasta de outro job
  const caminhoForjado = `${ids.jobB}/contrato/${crypto.randomUUID()}.pdf`
  const arqForjado = await sb.from('arquivos').insert({ job_id: ids.jobA, tipo: 'outro', storage_path: caminhoForjado, nome: '[teste] forjado', created_by: eu }).select('id')
  ok('arquivo não pode apontar para a pasta de outro job', !arqForjado.data?.length, arqForjado.error?.message)

  // Fotos: pasta de outra pessoa
  const fotoAlheia = await sb.storage
    .from('avatares')
    .upload(`${ids.usuarios.diretoria_executiva}/${crypto.randomUUID()}.webp`, new Blob(['x'], { type: 'image/webp' }), { contentType: 'image/webp' })
  ok('não grava foto na pasta de outra pessoa', Boolean(fotoAlheia.error))
  const fotoRpc = await sb.rpc('definir_minha_foto', { p_path: `${ids.usuarios.diretoria_executiva}/qualquer.webp` })
  ok('não aponta a própria foto para a pasta de outra pessoa', Boolean(fotoRpc.error))

  console.log('\nAtaques de outros perfis')
  r = await consegue('gerente_jaf', 'profiles', { perfil: 'diretoria_executiva' }, { id: ids.usuarios.gerente_jaf! })
  ok('gerente jurídico/adm/financeiro não se promove', !r.aceitou, r.erro)
  const sbAt = await como('analista_atendimento')
  const del = await sbAt.from('jobs').delete().eq('id', ids.jobA!).select()
  ok('atendimento não exclui job', !del.data?.length)
  const valAt = await sbAt.from('job_valores').select('*')
  ok('atendimento não lê nenhum valor', !(valAt.data ?? []).some((v) => v.job_id === ids.jobA || v.job_id === ids.jobB))

  // limpa o arquivo de teste do Storage (o registro sai junto com o job)
  await admin.storage.from('arquivos').remove([caminhoB])
}

// ---------- Execução ----------

console.log(`Testando regras de acesso em ${URL}`)
try {
  await preparar()
  await testarValores()
  await testarTrilhas()
  await testarSituacao()
  await testarGestao()
  await testarAtaques()
} catch (e) {
  falhas++
  console.error('\nErro ao rodar os testes:', e instanceof Error ? e.message : e)
} finally {
  for (const sb of sessoes.values()) await sb.auth.signOut()
  await limpar()
  console.log('\nDados de teste apagados.')
}

console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTodas as regras se comportaram como esperado.')
process.exit(falhas ? 1 : 0)
