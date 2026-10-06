import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth-card'
import { DefinirSenhaForm } from '@/components/forms-auth'

export const metadata: Metadata = { title: 'Definir senha' }

export default function DefinirSenhaPage() {
  return (
    <AuthCard titulo="Crie sua senha" descricao="Você vai usar esta senha junto com o seu e-mail para entrar.">
      <DefinirSenhaForm />
    </AuthCard>
  )
}
