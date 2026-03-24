'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Insight } from '@/types'

type Props = { insight: Insight; className?: string }

function Section({ title, content }: { title: string; content: string }) {
  // Split paragraphs and render with proper spacing
  const paragraphs = content.split('\n\n').filter(Boolean)
  return (
    <div>
      <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-accent/80 mb-2">
        {title}
      </h3>
      <div className="flex flex-col gap-3">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm text-[#c4c4cc] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: p
                // Bold **text** patterns
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function AISummary({ insight, className }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (!insight.summary) return null

  const hasFullBriefing = insight.cross_functional_themes || insight.risk_items || insight.bottom_line || insight.initiative_tracking

  return (
    <div className={cn(
      'bg-accent/[0.06] border border-accent/[0.18] rounded-xl px-5 py-4',
      className,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-accent flex items-center gap-1.5">
          <span>✦</span> AI Weekly Briefing
        </p>
        {hasFullBriefing && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-medium text-accent/70 hover:text-accent transition-colors"
          >
            {expanded ? 'Collapse' : 'Read full briefing →'}
          </button>
        )}
      </div>

      {/* Always show: bottom line or summary */}
      <p className="text-sm text-[#c4c4cc] leading-relaxed">
        {insight.bottom_line || insight.summary}
      </p>

      {/* Highlights — always visible */}
      {insight.highlights && insight.highlights.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
          {insight.highlights.map((h: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#a1a1aa]">
              <span className="text-accent font-bold text-xs mt-0.5 shrink-0">→</span>
              {h}
            </li>
          ))}
        </ul>
      )}

      {/* Expanded: full briefing sections */}
      {expanded && hasFullBriefing && (
        <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-col gap-5">
          {insight.cross_functional_themes && (
            <Section title="Cross-Functional Themes" content={insight.cross_functional_themes} />
          )}
          {insight.risk_items && (
            <Section title="Risk & Decision Items" content={insight.risk_items} />
          )}
          {insight.initiative_tracking && (
            <Section title="Initiative Tracking" content={insight.initiative_tracking} />
          )}
          {insight.bottom_line && insight.summary && (
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-accent/80 mb-2">
                Executive Summary
              </h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">{insight.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
