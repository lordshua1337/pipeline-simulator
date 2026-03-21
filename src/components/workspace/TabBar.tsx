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
  const info = SIM_TYPES.find((s) => s.type === tab.simData.type)
  return info?.color || '#64748B'
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onRename, onDuplicate, onNew }: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startRename = (tab: WorkspaceTab) => {
    setEditingId(tab.id)
    setEditValue(tab.name)
  }

  const finishRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div
      className="flex items-center h-10 px-1 overflow-x-auto flex-shrink-0"
      style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const color = getTabColor(tab)

        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => startRename(tab)}
            className="group flex items-center gap-1.5 px-3 h-8 rounded-t-lg cursor-pointer transition-all flex-shrink-0 max-w-[200px]"
            style={{
              background: isActive ? 'var(--surface)' : 'transparent',
              borderLeft: isActive ? '1px solid var(--border)' : '1px solid transparent',
              borderRight: isActive ? '1px solid var(--border)' : '1px solid transparent',
              borderTop: isActive ? '1px solid var(--border)' : '1px solid transparent',
              marginBottom: isActive ? '-1px' : '0',
            }}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

            {editingId === tab.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={finishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') finishRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="text-[11px] font-medium bg-transparent border-none outline-none w-24"
                style={{ color: 'var(--text)' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-[11px] font-medium truncate"
                style={{ color: isActive ? 'var(--text)' : 'var(--text-muted)' }}
              >
                {tab.name}
              </span>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(tab.id) }}
                className="w-4 h-4 flex items-center justify-center rounded"
                style={{ color: 'var(--text-muted)' }}
                title="Duplicate"
              >
                <Copy className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                className="w-4 h-4 flex items-center justify-center rounded hover:text-red-400"
                style={{ color: 'var(--text-muted)' }}
                title="Close"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )
      })}

      <button
        onClick={onNew}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ml-1"
        style={{ color: 'var(--text-muted)' }}
        title="New simulation"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
