'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { GripHorizontal, Trash2, BarChart3 } from 'lucide-react'
import { getStageHealth } from '@/lib/utils/health'
import type { Stage, Item } from '@/lib/types'

interface KanbanBoardProps {
  readonly stages: readonly Stage[]
  readonly items: readonly Item[]
  readonly onItemMove: (itemId: string, toStageId: string) => void
  readonly onDeleteItem: (itemId: string) => void
}

export default function KanbanBoard({
  stages,
  items,
  onItemMove,
  onDeleteItem,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const itemId = active.id as string
    const toStageId = over.id as string
    const item = items.find((i) => i.id === itemId)

    if (!item || item.stageId === toStageId) return
    onItemMove(itemId, toStageId)
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageItems = items.filter((i) => i.stageId === stage.id)
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              items={stageItems}
              onDeleteItem={onDeleteItem}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeItem ? <ItemCard item={activeItem} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

// Stage Column
function StageColumn({
  stage,
  items,
  onDeleteItem,
}: {
  stage: Stage
  items: readonly Item[]
  onDeleteItem: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const health = getStageHealth(items)
  const totalValue = items.reduce((sum, i) => sum + i.value, 0)

  const healthBg =
    health === 'red'
      ? 'var(--red-soft)'
      : health === 'yellow'
        ? 'var(--amber-soft)'
        : 'var(--bg)'

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-72 rounded-xl p-4 transition-all"
      style={{
        background: isOver ? 'var(--blue-soft)' : healthBg,
        border: `2px solid ${isOver ? 'var(--blue)' : stage.color}`,
        borderTop: `4px solid ${stage.color}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-sm">{stage.name}</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
          style={{ background: stage.color }}
        />
      </div>

      {/* Stats */}
      {items.length > 0 && totalValue > 0 && (
        <div
          className="flex items-center justify-between mb-3 px-2 py-1.5 rounded text-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            ${totalValue.toLocaleString()}
          </span>
          <BarChart3 size={12} style={{ color: 'var(--text-muted)' }} />
        </div>
      )}

      {/* Items */}
      <div className="space-y-2 min-h-[200px]">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Item Card
function ItemCard({
  item,
  isDragging = false,
  onDelete,
}: {
  item: Item
  isDragging?: boolean
  onDelete?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } =
    useDraggable({ id: item.id })

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    opacity: dragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg shadow-sm transition cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg ring-2 ring-blue-300' : ''
      }`}
      {...attributes}
      {...listeners}
      data-testid="item-card"
    >
      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start gap-2">
          <GripHorizontal
            size={14}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{item.title}</h4>
            {item.value > 0 && (
              <p className="text-xs font-bold" style={{ color: 'var(--green)' }}>
                ${item.value.toLocaleString()}
              </p>
            )}
            {item.description && (
              <p
                className="text-[10px] line-clamp-1 mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.description}
              </p>
            )}
            {item.isSample && (
              <span
                className="inline-block text-[9px] px-1 py-0.5 rounded mt-1"
                style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}
              >
                Sample
              </span>
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 rounded hover:bg-[var(--red-soft)] transition shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
