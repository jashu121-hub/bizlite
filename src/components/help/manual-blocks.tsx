import {
  AlertTriangle,
  CheckSquare,
  Info,
  Lightbulb,
} from 'lucide-react'

import type { ManualBlock } from '@/lib/help/types'
import { cn } from '@/lib/utils'

function highlightText(text: string, query: string) {
  const q = query.trim()
  if (!q) return text

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, index) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-200/80 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  )
}

function Callout({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'tip' | 'info' | 'warning'
  icon: typeof Info
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border p-3.5 text-sm leading-relaxed',
        tone === 'tip' && 'border-teal-200 bg-teal-50/70 text-teal-950',
        tone === 'info' && 'border-sky-200 bg-sky-50/80 text-sky-950',
        tone === 'warning' && 'border-amber-300 bg-amber-50 text-amber-950',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ManualBlocks({
  blocks,
  query = '',
}: {
  blocks: ManualBlock[]
  query?: string
}) {
  const h = (text: string) => highlightText(text, query)

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`
        switch (block.type) {
          case 'p':
            return (
              <p key={key} className="text-sm leading-relaxed text-zinc-700">
                {h(block.text)}
              </p>
            )
          case 'h3':
            return (
              <h3 key={key} className="pt-1 text-base font-semibold text-zinc-900">
                {h(block.text)}
              </h3>
            )
          case 'ol':
            return (
              <ol key={key} className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
                {block.items.map((item, i) => (
                  <li key={i} className="leading-relaxed pl-1">
                    {h(item)}
                  </li>
                ))}
              </ol>
            )
          case 'ul':
            return (
              <ul key={key} className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
                {block.items.map((item, i) => (
                  <li key={i} className="leading-relaxed pl-1">
                    {h(item)}
                  </li>
                ))}
              </ul>
            )
          case 'checklist':
            return (
              <ul key={key} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5">
                {block.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                    <span>{h(item)}</span>
                  </li>
                ))}
              </ul>
            )
          case 'tip':
            return (
              <Callout key={key} tone="tip" icon={Lightbulb}>
                <p>
                  <span className="font-semibold">Tip: </span>
                  {h(block.text)}
                </p>
              </Callout>
            )
          case 'info':
            return (
              <Callout key={key} tone="info" icon={Info}>
                <p>{h(block.text)}</p>
              </Callout>
            )
          case 'warning':
            return (
              <Callout key={key} tone="warning" icon={AlertTriangle}>
                <p>
                  <span className="font-semibold">Warning: </span>
                  {h(block.text)}
                </p>
              </Callout>
            )
          case 'example':
            return (
              <div
                key={key}
                className="rounded-xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-700 shadow-sm"
              >
                {block.title ? (
                  <p className="mb-1.5 font-semibold text-zinc-900">{h(block.title)}</p>
                ) : null}
                <p className="leading-relaxed">{h(block.text)}</p>
              </div>
            )
          case 'formula':
            return (
              <div
                key={key}
                className="rounded-xl border border-teal-200 bg-[#0b3d38] px-4 py-3 text-sm font-medium text-emerald-50 shadow-sm"
              >
                {h(block.text)}
              </div>
            )
          case 'dl':
            return (
              <dl key={key} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3.5">
                {block.items.map((item) => (
                  <div key={item.term} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
                    <dt className="text-sm font-semibold text-teal-900">{h(item.term)}</dt>
                    <dd className="text-sm leading-relaxed text-zinc-700">{h(item.definition)}</dd>
                  </div>
                ))}
              </dl>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
