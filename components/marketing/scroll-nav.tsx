'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const SECTIONS = [
  { id: 'how', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
]

export function ScrollNav() {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the largest intersection ratio
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    )

    for (const el of els) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <ul className="hidden md:flex items-center gap-1">
      {SECTIONS.map(({ id, label }) => (
        <li key={id}>
          <Link
            href={`#${id}`}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              active === id
                ? 'text-white font-medium'
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
