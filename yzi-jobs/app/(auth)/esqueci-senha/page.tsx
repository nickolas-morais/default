import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth-card'
import { EsqueciForm } from '@/components/forms-auth'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

export default function EsqueciPage() {
  return (
    <AuthCard titulo="Esqueci minha senha" descricao="Enviamos um link para você criar uma senha nova.">
      <EsqueciForm />
    </AuthCard>
  )
}
