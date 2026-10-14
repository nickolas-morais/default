'use client'

import { WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/section'

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      titulo="Não foi possível carregar esta tela"
      icone={WarningCircleIcon}
      acao={
        <Button variante="secundario" onClick={reset}>
          Tentar de novo
        </Button>
      }
    >
      Verifique sua conexão e tente de novo. Se continuar, avise a diretoria.
    </EmptyState>
  )
}
