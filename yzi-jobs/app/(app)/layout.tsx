import { cookies } from 'next/headers'
import { AtualizarAoVoltar } from '@/components/atualizar-ao-voltar'
import { Sidebar, type GrupoNav } from '@/components/sidebar'
import { COOKIE_MENU, lerMenuRecolhido } from '@/lib/menu'
import { COOKIE_TEMA, lerTema } from '@/lib/tema'
import { contarAlertas } from '@/lib/dados'
import { urlFoto } from '@/lib/foto'
import { PERFIL_LABEL, podeCriarJob, veAlgumValor } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ supabase, usuario }, cookieStore] = await Promise.all([exigirSessao(), cookies()])
  const alertas = await contarAlertas(supabase)
  const tema = lerTema(cookieStore.get(COOKIE_TEMA)?.value)
  const p = usuario.perfil

  const gestao: GrupoNav['itens'] = [
    ...(veAlgumValor(p) ? [{ href: '/metas', label: 'Metas comerciais', icone: 'metas' as const }] : []),
    ...(podeCriarJob(p) ? [{ href: '/cadastros', label: 'Cadastros', icone: 'cadastros' as const }] : []),
    ...(p === 'diretoria_executiva' ? [{ href: '/admin/usuarios', label: 'Usuários', icone: 'usuarios' as const }] : []),
  ]
  const grupos: GrupoNav[] = [
    {
      titulo: 'Operação',
      itens: [
        { href: '/', label: 'Matriz de status', icone: 'matriz' },
        { href: '/agenda', label: 'Agenda de entregas', icone: 'agenda' },
        { href: '/alertas', label: 'Alertas', icone: 'alertas' },
        { href: '/talentos', label: 'Talentos', icone: 'talentos' },
      ],
    },
    ...(gestao.length ? [{ titulo: 'Gestão', itens: gestao }] : []),
  ]

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_minmax(0,1fr)] md:transition-[grid-template-columns] md:duration-200 md:menu-recolhido:grid-cols-[64px_minmax(0,1fr)] motion-reduce:transition-none">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:ring-2 focus:ring-accent"
      >
        Pular para o conteúdo
      </a>
      <AtualizarAoVoltar />
      <Sidebar
        grupos={grupos}
        alertas={alertas}
        usuario={{ nome: usuario.nome, perfil: PERFIL_LABEL[p], foto: urlFoto(usuario.foto) }}
        tema={tema}
        recolhidoInicial={lerMenuRecolhido(cookieStore.get(COOKIE_MENU)?.value)}
      />
      <main id="conteudo" className="min-w-0 px-4 pb-12 pt-6 md:px-8 md:pt-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">{children}</div>
      </main>
    </div>
  )
}
