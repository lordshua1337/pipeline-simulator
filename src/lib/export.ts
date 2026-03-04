// Pipeline Simulator -- Export Utilities

import type { Pipeline, Stage, Item, AnalyticsMetrics } from './types'

export function exportPipelineCSV(
  pipeline: Pipeline,
  stages: readonly Stage[],
  items: readonly Item[]
): string {
  const stageMap = new Map(stages.map((s) => [s.id, s.name]))
  const header = 'Title,Stage,Value,Description,Entered At,Updated At'
  const rows = items.map((item) => {
    const stageName = stageMap.get(item.stageId) ?? 'Unknown'
    const desc = (item.description ?? '').replace(/,/g, ';')
    return `${item.title},${stageName},${item.value},${desc},${item.enteredAt},${item.updatedAt}`
  })
  return [header, ...rows].join('\n')
}

export function exportPipelineJSON(
  pipeline: Pipeline,
  stages: readonly Stage[],
  items: readonly Item[],
  metrics: AnalyticsMetrics
): string {
  return JSON.stringify(
    {
      pipeline: {
        name: pipeline.name,
        type: pipeline.type,
        status: pipeline.status,
        createdAt: pipeline.createdAt,
      },
      stages: stages.map((s) => ({
        name: s.name,
        position: s.position,
        color: s.color,
        itemCount: items.filter((i) => i.stageId === s.id).length,
      })),
      items: items.map((i) => ({
        title: i.title,
        value: i.value,
        stage: stages.find((s) => s.id === i.stageId)?.name ?? 'Unknown',
      })),
      metrics,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  )
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
