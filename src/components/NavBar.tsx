'use client'

import Link from 'next/link'
import { Activity, LayoutGrid } from 'lucide-react'

export default function NavBar() {
  return (
    <nav
      className="w-full px-6 h-14 flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 group">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ background: 'var(--accent-soft)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
        >
          <Activity size={14} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Pipeline Simulator
        </span>
      </Link>

      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--bg-alt)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <LayoutGrid size={13} />
        Pipelines
      </Link>
    </nav>
  )
}
