import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/section'

export default function NaoEncontrado() {
  return (
    <EmptyState
      titulo="Página não encontrada"
      icone={MagnifyingGlassIcon}
      acao={
        <ButtonLink href="/" variante="secundario">
          Ir para a matriz
        </ButtonLink>
      }
    >
      O job pode ter sido removido, ou o link está incompleto.
    </EmptyState>
  )
}
