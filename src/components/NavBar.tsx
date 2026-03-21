'use client'

import Link from 'next/link'
import { Activity, LayoutGrid } from 'lucide-react'

export default function NavBar() {
  return (
    <nav
      className="w-full px-6 h-16 flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 group">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: 'var(--accent-soft)', border: '1px solid rgba(16, 185, 129, 0.25)' }}
        >
          <Activity size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Pipeline Simulator
        </span>
      </Link>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <LayoutGrid size={14} />
        Pipelines
      </Link>
    </nav>
  )
}
