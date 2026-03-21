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
    <div className="flex items-center h-10 bg-gray-50 border-b border-gray-200 px-1 overflow-x-auto flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const color = getTabColor(tab)

        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => startRename(tab)}
            className={`group flex items-center gap-1.5 px-3 h-8 rounded-t-lg cursor-pointer transition-colors flex-shrink-0 max-w-[200px] ${
              isActive
                ? 'bg-white border border-gray-200 border-b-white -mb-px'
                : 'hover:bg-gray-100'
            }`}
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
                className="text-[11px] font-medium bg-transparent border-none outline-none w-24 text-gray-900"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-[11px] font-medium text-gray-700 truncate">{tab.name}</span>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(tab.id) }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200"
                title="Duplicate"
              >
                <Copy className="w-2.5 h-2.5 text-gray-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-100"
                title="Close"
              >
                <X className="w-2.5 h-2.5 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          </div>
        )
      })}

      {/* New tab button */}
      <button
        onClick={onNew}
        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 ml-1"
        title="New simulation"
      >
        <Plus className="w-3.5 h-3.5 text-gray-400" />
      </button>
    </div>
  )
}
