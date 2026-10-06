import { gerarCsv, respostaCsv } from '@/lib/csv'
import { data, hojeSP } from '@/lib/format'
import { carregarMatriz, nomeJob } from '@/lib/matriz'
import { veAlgumValor } from '@/lib/perfis'
import { getSessao } from '@/lib/sessao'
import { ENT_PUBLICADO, rotulo, SITUACAO_LABEL } from '@/lib/status'

// Exporta a matriz com os mesmos filtros da tela (?ver=, ?talento=, ?q=).
// Usa a sessão de quem pede: o RLS continua decidindo quem vê os valores.
export async function GET(request: Request) {
  const sessao = await getSessao()
  if (!sessao) return new Response('Sessão expirada', { status: 401 })
  const { supabase, usuario } = sessao

  const params = new URL(request.url).searchParams
  // sem paginação: exporta tudo o que os filtros mostram
  const { filtrados, alertas } = await carregarMatriz(supabase, {
    ver: params.get('ver') ?? undefined,
    talento: params.get('talento') ?? undefined,
    q: params.get('q') ?? undefined,
  })
  const comValor = veAlgumValor(usuario.perfil)

  const cabecalho = [
    'Código',
    'Job',
    'Marca',
    'Talentos',
    'Vendido por',
    'Situação',
    'Fim da vigência',
    'Jurídico',
    'Administrativo',
    'NF da YZI',
    'NF dos talentos',
    'Entregas publicadas',
    'Entregas no total',
    'Próxima entrega',
    'Estratégia',
    'Alvará',
    'Alertas',
    ...(comValor ? ['Valor do job (R$)'] : []),
  ]
  const linhas = filtrados.map((j) => {
    const pendentes = j.entregaveis.filter((e) => e.status < ENT_PUBLICADO).map((e) => e.data_prevista)
    const proxima = pendentes.length ? pendentes.reduce((a, b) => (a < b ? a : b)) : null
    return [
      j.codigo,
      nomeJob(j),
      j.marca.nome,
      j.job_talentos.map((t) => t.talento.nome).join(', '),
      j.vendedor.nome,
      SITUACAO_LABEL[j.situacao],
      data(j.vigencia_fim),
      rotulo('jur', j.jur_status),
      rotulo('adm', j.adm_status),
      rotulo('nf', j.nf_yzi_status),
      j.job_talentos.map((t) => `${t.talento.nome}: ${rotulo('nf', t.nf_status)}`).join('; '),
      String(j.entregaveis.filter((e) => e.status === ENT_PUBLICADO).length),
      String(j.entregaveis.length),
      proxima ? data(proxima) : '',
      j.est_status === 0 ? 'Não acionada' : rotulo('est', j.est_status),
      j.alvara_exigido ? rotulo('alv', j.alvara_status) : 'Não exige',
      (alertas.get(j.id) ?? []).map((a) => a.descricao).join('; '),
      // null = o RLS não liberou o valor deste job para quem exportou
      ...(comValor ? [j.job_valores ? Number(j.job_valores.valor_total) : 'Restrito'] : []),
    ]
  })

  return respostaCsv('matriz-de-status', gerarCsv(cabecalho, linhas), hojeSP())
}
