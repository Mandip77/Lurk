import { Badge } from '@/components/ui/badge'
import type { FindingSeverity } from '@/types'

const styles: Record<FindingSeverity, string> = {
  critical: 'bg-red-950 text-red-400 border-red-900',
  high: 'bg-orange-950 text-orange-400 border-orange-900',
  medium: 'bg-yellow-950 text-yellow-400 border-yellow-900',
  low: 'bg-blue-950 text-blue-400 border-blue-900',
  info: 'bg-slate-800 text-slate-400 border-slate-700',
}

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return (
    <Badge variant="outline" className={styles[severity]}>
      {severity.toUpperCase()}
    </Badge>
  )
}
