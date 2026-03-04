'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Pipelines', icon: LayoutDashboard },
] as const

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav
      className="w-full px-6 py-3 flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <Link href="/" className="flex items-center gap-2 group">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all group-hover:scale-105"
          style={{ background: 'var(--blue-soft)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
        >
          <Activity size={18} style={{ color: 'var(--blue)' }} />
        </div>
        <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          Pipeline Simulator
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(href + '/')

          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? 'var(--blue-soft)' : 'transparent',
                color: isActive ? 'var(--blue)' : 'var(--text-secondary)',
              }}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
