import { CakeSlice } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Placeholder() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <CakeSlice className="size-12 text-primary" />
      <h1 className="text-3xl font-semibold">Doce Gestão</h1>
      <p className="text-muted-foreground max-w-md">
        Base do projeto pronta. As telas serão construídas nas próximas fases.
      </p>
      <Button>Tudo funcionando</Button>
    </div>
  )
}
