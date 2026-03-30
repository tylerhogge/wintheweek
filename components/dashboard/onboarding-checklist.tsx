'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, Circle, X, ChevronRight, Zap } from 'lucide-react'

type Props = {
  hasTeam: boolean
  hasCampaign: boolean
  hasSentFirst: boolean
  hasSlack: boolean
  hasShame: boolean
  onDismiss?: () => void
}

interface ChecklistItem {
  id: keyof Omit<Props, 'onDismiss'>
  label: string
  description: string
  href: string
  completed: boolean
}

export function OnboardingChecklist({
  hasTeam,
  hasCampaign,
  hasSentFirst,
  hasSlack,
  hasShame,
  onDismiss,
}: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wtw-checklist-dismissed') === '1'
    }
    return false
  })
  const [isExpanded, setIsExpanded] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('wtw-checklist-dismissed', '1')
    onDismiss?.()
  }

  const items: ChecklistItem[] = [
    {
      id: 'hasTeam',
      label: 'Add your team',
      description: 'Import or add the people who\'ll receive check-ins',
      href: '/team',
      completed: hasTeam,
    },
    {
      id: 'hasCampaign',
      label: 'Create a campaign',
      description: 'Write your weekly check-in email',
      href: '/campaigns',
      completed: hasCampaign,
    },
    {
      id: 'hasSentFirst',
      label: 'Send your first check-in',
      description: 'Send a test or schedule your first real one',
      href: '/campaigns',
      completed: hasSentFirst,
    },
    {
      id: 'hasSlack',
      label: 'Connect Slack',
      description: 'Get replies delivered via Slack DMs too',
      href: '/settings',
      completed: hasSlack,
    },
    {
      id: 'hasShame',
      label: 'Set up accountability',
      description: 'Turn on auto-nudge and Wall of Shame',
      href: '/settings',
      completed: hasShame,
    },
  ]

  const completedCount = items.filter(item => item.completed).length
  const totalCount = items.length
  const isComplete = completedCount === totalCount

  // Show celebration when all items are complete
  useEffect(() => {
    if (isComplete && !showCelebration) {
      setShowCelebration(true)
      const timer = setTimeout(() => {
        dismiss()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isComplete, showCelebration, onDismiss])

  if (dismissed) {
    return null
  }

  // Celebration screen
  if (showCelebration) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-emerald-950/40 to-teal-950/40 p-6 text-center backdrop-blur-sm">
        <div className="mb-4 inline-block animate-bounce text-4xl">
          <Zap className="h-10 w-10 text-emerald-400" fill="currentColor" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">
          You're all set!
        </h3>
        <p className="text-sm text-zinc-400">
          Your Win The Week setup is complete. Let's start winning.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
      {/* Header with collapse toggle */}
      <div className="border-b border-white/[0.07] px-6 py-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3 flex-1">
            <Zap className="h-5 w-5 text-amber-400/80" />
            <div className="flex-1">
              <h2 className="font-semibold text-white">
                Get started with Win The Week
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {completedCount} of {totalCount} complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-medium text-zinc-300">
                {Math.round((completedCount / totalCount) * 100)}%
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                dismiss()
              }}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 transition-colors"
              aria-label="Dismiss checklist"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </button>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-zinc-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 py-4 space-y-3">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={`group flex items-start gap-3 rounded-lg p-3 transition-colors ${
                item.completed
                  ? 'cursor-default'
                  : 'hover:bg-white/[0.03] cursor-pointer'
              }`}
            >
              {/* Checkbox */}
              <div className="mt-0.5 flex-shrink-0">
                {item.completed ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-medium transition-all ${
                    item.completed
                      ? 'text-zinc-500 line-through'
                      : 'text-white group-hover:text-zinc-50'
                  }`}
                >
                  {item.label}
                </h3>
                <p
                  className={`text-xs mt-0.5 transition-colors ${
                    item.completed ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {item.description}
                </p>
              </div>

              {/* Arrow indicator */}
              {!item.completed && (
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400 flex-shrink-0 mt-0.5 transition-colors" />
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Collapsed state footer */}
      {!isExpanded && (
        <div className="px-6 py-3 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            {completedCount === 0
              ? 'Start here to get set up'
              : `${totalCount - completedCount} step${totalCount - completedCount === 1 ? '' : 's'} remaining`}
          </span>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  )
}
