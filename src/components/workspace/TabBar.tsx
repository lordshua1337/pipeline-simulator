'use client'

import { useState } from 'react'
import { X, Plus, Copy } from 'lucide-react'
import type { WorkspaceTab } from '@/lib/workspace-types'
import { SIM_TYPES } from '@/lib/workspace-types'

interface TabBarProps {
  tabs: readonly WorkspaceTab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onNew: () => void
}

function getTabColor(tab: WorkspaceTab): string {
  return SIM_TYPES.find((s) => s.type === tab.simData.type)?.color || '#9C9C96'
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onRename, onDuplicate, onNew }: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  return (
    <div
      className="flex items-end h-10 px-2 overflow-x-auto flex-shrink-0 gap-[2px]"
      style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const color = getTabColor(tab)

        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => { setEditingId(tab.id); setEditValue(tab.name) }}
            className="group flex items-center gap-1.5 px-3 h-[34px] cursor-pointer transition-all flex-shrink-0 max-w-[200px] rounded-t-lg"
            style={{
              background: isActive ? 'var(--surface)' : 'transparent',
              borderTop: isActive ? '2px solid ' + color : '2px solid transparent',
              borderLeft: isActive ? '1px solid var(--border)' : 'none',
              borderRight: isActive ? '1px solid var(--border)' : 'none',
              marginBottom: isActive ? '-1px' : '0',
            }}
          >
            <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

            {editingId === tab.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => { if (editValue.trim()) onRename(tab.id, editValue.trim()); setEditingId(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (editValue.trim()) onRename(tab.id, editValue.trim()); setEditingId(null) } }}
                className="text-[11px] font-medium bg-transparent border-none outline-none w-24"
                style={{ color: 'var(--text)' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-[11px] font-medium truncate" style={{ color: isActive ? 'var(--text)' : 'var(--text-muted)' }}>
                {tab.name}
              </span>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto">
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(tab.id) }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--bg-alt)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <Copy className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-50"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )
      })}

      <button
        onClick={onNew}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ml-1 hover:bg-[var(--border)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
