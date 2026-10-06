import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { FormSection } from '@/components/ui/form-section'
import { ConviteForm, EquipeLista, type Pessoa } from '@/components/usuarios'
import { Avatar } from '@/components/ui/avatar'
import { dataHora, plural } from '@/lib/format'
import { descreverHistoricoEquipe, type ItemHistoricoEquipe } from '@/lib/historico'
import type { Perfil } from '@/lib/perfis'
import { urlFoto } from '@/lib/foto'
import { exigirSessao } from '@/lib/sessao'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Usuários' }

export default async function UsuariosPage() {
  const { supabase, usuario } = await exigirSessao()
  if (usuario.perfil !== 'diretoria_executiva') redirect('/')

  // "convite pendente" vem do Auth (nunca entrou); a service role só roda depois de confirmar a diretoria
  const [perfis, contas, historico] = await Promise.all([
    supabase.from('profiles').select('id, nome, email, perfil, ativo, foto_path').order('nome'),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
    supabase
      .from('historico_equipe')
      .select('id, campo, alvo_nome, valor_anterior, valor_novo, created_at, autor:profiles!historico_equipe_autor_id_fkey(nome, foto_path)')
      .order('created_at', { ascending: false })
      .limit(30),
  ])
  // seção secundária: sem a migração 10, a tela continua funcionando e só avisa
  if (historico.error) console.error('historico_equipe', historico.error)
  const alteracoes = (historico.data ?? []) as unknown as ItemHistoricoEquipe[]
  const jaEntrou = new Set((contas.data?.users ?? []).filter((u) => u.last_sign_in_at).map((u) => u.id))
  // se o Auth não responder, ninguém aparece como pendente (Excluir fica desabilitado, o lado seguro)
  const authOk = !contas.error
  const pessoas: Pessoa[] = (perfis.data ?? []).map(({ foto_path, ...p }) => ({
    ...p,
    foto: urlFoto(foto_path),
    perfil: p.perfil as Perfil,
    pendente: authOk && !jaEntrou.has(p.id),
  }))
  const ativos = pessoas.filter((p) => p.ativo).length
  const pendentes = pessoas.filter((p) => p.ativo && p.pendente).length

  return (
    <>
      <PageHeader titulo="Usuários" descricao="Quem acessa o sistema e com qual perfil. O perfil define o que cada pessoa vê e altera." />

      <FormSection titulo="Convidar pessoa" descricao="A pessoa recebe um e-mail com o link para criar a senha.">
        <ConviteForm />
      </FormSection>

      <section aria-labelledby="equipe" className="border-t border-line pt-8">
        <h2 id="equipe" className="mb-3 flex items-baseline gap-2 text-[15px] font-semibold">
          Equipe
          <span className="tabular text-[13px] font-normal text-muted">
            {plural(ativos, 'pessoa ativa', 'pessoas ativas')}
            {pendentes ? `, ${plural(pendentes, 'convite pendente', 'convites pendentes')}` : ''}
          </span>
        </h2>
        <EquipeLista pessoas={pessoas} eu={usuario.id} />
      </section>

      <section aria-labelledby="alteracoes" className="mt-10 border-t border-line pt-8">
        <h2 id="alteracoes" className="mb-1 text-[15px] font-semibold">
          Últimas alterações na equipe
        </h2>
        <p className="mb-3 text-[13px] text-muted">Convites, perfis, acessos, nomes e e-mails. Só a diretoria executiva vê.</p>
        {historico.error ? (
          <p className="text-[13.5px] text-muted">Histórico indisponível no momento.</p>
        ) : alteracoes.length === 0 ? (
          <p className="text-[13.5px] text-muted">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ol className="divide-y divide-line rounded-[10px] border border-line bg-surface">
            {alteracoes.map((h) => (
              <li key={h.id} className="flex gap-3 px-5 py-3">
                <Avatar nome={h.autor?.nome ?? 'Sistema'} foto={urlFoto(h.autor?.foto_path)} tamanho="sm" />
                <div className="min-w-0 text-[13.5px]">
                  <p className="break-words">
                    <strong className="font-medium">{h.autor?.nome ?? 'Sistema'}</strong> {descreverHistoricoEquipe(h)}
                  </p>
                  <time dateTime={h.created_at} className="tabular text-[12.5px] text-muted">
                    {dataHora(h.created_at)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}
