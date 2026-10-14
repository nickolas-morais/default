'use client'

import { useEffect } from 'react'
import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Toaster as Sonner, toast } from 'sonner'

// Padrão do app: sucesso vira toast; erro de formulário fica junto do campo;
// erro de ação sem formulário (status, perfil) também vira toast.
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      offset={{ top: 16, right: 16 }}
      mobileOffset={{ top: 'calc(64px + env(safe-area-inset-top))', right: 16, left: 16 }}
      duration={4000}
      visibleToasts={3}
      icons={{
        success: <CheckCircleIcon aria-hidden="true" size={18} weight="fill" className="text-done" />,
        error: <WarningCircleIcon aria-hidden="true" size={18} weight="fill" className="text-crit" />,
        info: <InfoIcon aria-hidden="true" size={18} weight="fill" className="text-accent" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-[10px] border border-line-strong bg-surface px-4 py-3 text-[13.5px] text-ink shadow-[0_8px_24px_rgb(0_0_0/0.12)]',
          icon: 'mt-px shrink-0',
          content: 'min-w-0 flex-1',
          title: 'font-medium',
          description: 'mt-0.5 text-[12.5px] text-muted',
          actionButton:
            'shrink-0 self-center rounded-md border border-line-strong px-2.5 py-1 text-[12.5px] font-medium text-ink hover:bg-sunken',
        },
      }}
    />
  )
}

/** Mostra o "ok" de um useActionState como toast de sucesso, uma vez por resposta. */
export function useToastDeSucesso(estado: { ok?: string } | undefined) {
  useEffect(() => {
    if (estado?.ok) toast.success(estado.ok)
  }, [estado])
}

export { toast }
