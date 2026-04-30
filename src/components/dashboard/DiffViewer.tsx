'use client'

import { useState, useCallback } from 'react'

interface DiffLine {
  type: 'addition' | 'deletion' | 'header' | 'context'
  content: string
  lineNum: number
}

function parseDiff(raw: string): DiffLine[] {
  const lines = raw.split('\n')
  const result: DiffLine[] = []
  let lineNum = 0

  for (const line of lines) {
    lineNum++
    if (line.startsWith('@@')) {
      result.push({ type: 'header', content: line, lineNum })
    } else if (line.startsWith('+')) {
      result.push({ type: 'addition', content: line, lineNum })
    } else if (line.startsWith('-')) {
      result.push({ type: 'deletion', content: line, lineNum })
    } else {
      result.push({ type: 'context', content: line, lineNum })
    }
  }

  return result
}

const typeStyles: Record<DiffLine['type'], string> = {
  addition: 'bg-green-950/40 text-green-300',
  deletion: 'bg-red-950/40 text-red-300',
  header: 'bg-blue-950/40 text-blue-400',
  context: 'text-slate-400',
}

interface DiffViewerProps {
  diff: string
  highlightLines?: number[]
}

export function DiffViewer({ diff, highlightLines = [] }: DiffViewerProps) {
  const [copied, setCopied] = useState(false)
  const highlightSet = new Set(highlightLines)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(diff)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: ignore
    }
  }, [diff])

  const lines = parseDiff(diff)

  return (
    <div className="relative rounded-lg border border-slate-800 overflow-hidden font-mono text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <span className="text-slate-400 text-xs">Diff</span>
        <button
          onClick={handleCopy}
          className="text-xs text-slate-400 hover:text-[#00FF94] transition-colors px-2 py-1 rounded hover:bg-slate-800"
        >
          {copied ? '✓ Copied' : 'Copy diff'}
        </button>
      </div>

      {/* Lines */}
      <div className="overflow-x-auto bg-slate-950 max-h-[600px] overflow-y-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => {
              const isHighlighted = highlightSet.has(line.lineNum)
              return (
                <tr
                  key={i}
                  className={`${typeStyles[line.type]} ${
                    isHighlighted ? 'ring-1 ring-inset ring-[#00FF94]/50' : ''
                  }`}
                >
                  <td className="select-none text-slate-600 text-right pr-3 pl-4 py-0.5 w-12 border-r border-slate-800/50 shrink-0">
                    {line.lineNum}
                  </td>
                  <td className="pl-3 pr-4 py-0.5 whitespace-pre">{line.content}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
