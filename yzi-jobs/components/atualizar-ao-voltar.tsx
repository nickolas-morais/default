'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const INTERVALO = 5 * 60 * 1000

// Alguns alertas nascem só com a passagem do tempo (vigência acabando, entrega atrasada).
// Ao voltar para a aba depois de 5 minutos, recarrega os dados do servidor, inclusive o contador do menu.
export function AtualizarAoVoltar() {
  const router = useRouter()

  useEffect(() => {
    let ultima = Date.now()
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < INTERVALO) return
      ultima = Date.now()
      router.refresh()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [router])

  return null
}
