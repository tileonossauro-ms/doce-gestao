import { Hammer } from 'lucide-react'

export default function SecaoEmBreve({ titulo }: { titulo: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <Hammer className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">Esta tela será construída em uma próxima etapa.</p>
      </div>
    </div>
  )
}
