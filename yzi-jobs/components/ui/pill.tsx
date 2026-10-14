import { rotulo, tom, type Tom, type Trilha } from '@/lib/status'

const ESTILO: Record<Tom | 'crit', string> = {
  done: 'bg-done-soft text-done',
  prog: 'bg-prog-soft text-prog',
  idle: 'bg-idle-soft text-idle',
  off: 'text-muted ring-1 ring-inset ring-line',
  crit: 'bg-crit-soft text-crit',
}

export function Pill({ tom, children }: { tom: Tom | 'crit'; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[12.5px] font-medium leading-5 ${ESTILO[tom]}`}>
      {children}
    </span>
  )
}

export function StatusPill({ trilha, valor }: { trilha: Trilha; valor: number }) {
  return <Pill tom={tom(trilha, valor)}>{rotulo(trilha, valor)}</Pill>
}
