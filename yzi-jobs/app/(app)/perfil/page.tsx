import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { CheckIcon, EyeIcon } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/page-header'
import { SeletorTema } from '@/components/seletor-tema'
import { TrocarSenhaForm } from '@/components/trocar-senha-form'
import { FotoPerfil } from '@/components/foto-perfil'
import { FormSection } from '@/components/ui/form-section'
import { urlFoto } from '@/lib/foto'
import { PERFIL_LABEL, resumoPermissoes } from '@/lib/perfis'
import { exigirSessao } from '@/lib/sessao'
import { COOKIE_TEMA, lerTema } from '@/lib/tema'

export const metadata: Metadata = { title: 'Meu perfil' }

export default async function PerfilPage() {
  const [{ usuario }, cookieStore] = await Promise.all([exigirSessao(), cookies()])
  const tema = lerTema(cookieStore.get(COOKIE_TEMA)?.value)
  const { ve, altera } = resumoPermissoes(usuario.perfil)

  return (
    <>
      <PageHeader titulo="Meu perfil" descricao="Seus dados de acesso, o que o seu perfil permite e suas preferências." />

      <FormSection titulo="Conta" descricao="A foto você mesmo troca. Para mudar nome, e-mail ou perfil, fale com a diretoria executiva.">
        <FotoPerfil nome={usuario.nome} foto={urlFoto(usuario.foto)} />
        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 text-[13.5px] sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-[12.5px] text-muted">Nome</dt>
            <dd className="truncate font-medium">{usuario.nome}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[12.5px] text-muted">E-mail</dt>
            <dd className="break-all font-medium">{usuario.email}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[12.5px] text-muted">Perfil</dt>
            <dd className="font-medium">{PERFIL_LABEL[usuario.perfil]}</dd>
          </div>
        </dl>
      </FormSection>

      <FormSection titulo="O que o seu perfil permite" descricao="As regras valem no banco de dados, não só na tela.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ListaPermissoes titulo="Você vê" itens={ve} icone="ve" />
          <ListaPermissoes titulo="Você altera" itens={altera} icone="altera" />
        </div>
      </FormSection>

      <FormSection titulo="Senha" descricao="Depois de trocar, use a nova senha no próximo acesso.">
        <TrocarSenhaForm email={usuario.email} />
      </FormSection>

      <FormSection titulo="Aparência" descricao="Vale para este navegador. Em Sistema, segue o tema do computador.">
        <div className="max-w-sm">
          <SeletorTema inicial={tema} />
        </div>
      </FormSection>
    </>
  )
}

function ListaPermissoes({ titulo, itens, icone }: { titulo: string; itens: string[]; icone: 've' | 'altera' }) {
  const Icone = icone === 've' ? EyeIcon : CheckIcon
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-medium text-muted">{titulo}</h3>
      <ul className="flex flex-col gap-2 text-[14px]">
        {itens.map((t) => (
          <li key={t} className="flex gap-2.5">
            <Icone aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-accent" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
