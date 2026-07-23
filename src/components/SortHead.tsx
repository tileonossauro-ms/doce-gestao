import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'

export type SortState = { key: string | null; dir: 'asc' | 'desc' }

/** Compara dois valores: números por valor, texto por ordem alfabética pt-BR (ignora acento/caixa). */
function cmp(a: unknown, b: unknown): number {
  const an = a == null, bn = b == null
  if (an && bn) return 0
  if (an) return 1
  if (bn) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true })
}

/** Ordena `items` conforme o estado atual. `getVal(item, key)` extrai o valor da coluna. */
export function useSort<T>(
  items: T[],
  getVal: (item: T, key: string) => unknown,
  inicial: SortState = { key: null, dir: 'asc' },
) {
  const [sort, setSort] = useState<SortState>(inicial)
  const sorted = useMemo(() => {
    if (!sort.key) return items
    const arr = [...items].sort((a, b) => cmp(getVal(a, sort.key as string), getVal(b, sort.key as string)))
    return sort.dir === 'asc' ? arr : arr.reverse()
  }, [items, sort, getVal])
  function toggle(key: string) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }
  return { sorted, sort, toggle }
}

/** Cabeçalho de coluna clicável, com seta de ordenação. */
export function SortHead({
  children, sortKey, sort, onSort, className,
}: {
  children: React.ReactNode
  sortKey: string
  sort: SortState
  onSort: (key: string) => void
  className?: string
}) {
  const ativo = sort.key === sortKey
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
        title="Ordenar"
      >
        {children}
        {ativo ? (
          sort.dir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}
