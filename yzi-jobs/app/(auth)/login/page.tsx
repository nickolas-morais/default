import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth-card'
import { LoginForm } from '@/components/forms-auth'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ volta?: string }> }) {
  const { volta } = await searchParams
  return (
    <AuthCard titulo="Entrar">
      <LoginForm volta={volta} />
    </AuthCard>
  )
}
