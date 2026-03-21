'use client'

import { useState, useCallback, useRef } from 'react'

interface Viewport {
  x: number
  y: number
  zoom: number
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.1

export function useCanvasViewport(initial?: Partial<Viewport>) {
  const [viewport, setViewport] = useState<Viewport>({
    x: initial?.x ?? 0,
    y: initial?.y ?? 0,
    zoom: initial?.zoom ?? 1,
  })
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, canvasRect: DOMRect) => ({
      x: (screenX - canvasRect.left - viewport.x) / viewport.zoom,
      y: (screenY - canvasRect.top - viewport.y) / viewport.zoom,
    }),
    [viewport]
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta)),
    }))
  }, [])

  const startPan = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanning.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }, [])

  const onPanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const endPan = useCallback(() => {
    isPanning.current = false
  }, [])

  const zoomIn = useCallback(() => {
    setViewport((prev) => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP) }))
  }, [])

  const zoomOut = useCallback(() => {
    setViewport((prev) => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP) }))
  }, [])

  const fitToContent = useCallback((nodes: readonly { position: { x: number; y: number } }[], canvasWidth: number, canvasHeight: number) => {
    if (nodes.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 })
      return
    }

    const NODE_W = 200
    const NODE_H = 100
    const PADDING = 80

    const minX = Math.min(...nodes.map((n) => n.position.x)) - PADDING
    const minY = Math.min(...nodes.map((n) => n.position.y)) - PADDING
    const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_W)) + PADDING
    const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_H)) + PADDING

    const contentW = maxX - minX
    const contentH = maxY - minY

    const zoom = Math.min(canvasWidth / contentW, canvasHeight / contentH, 1.5)
    const x = (canvasWidth - contentW * zoom) / 2 - minX * zoom
    const y = (canvasHeight - contentH * zoom) / 2 - minY * zoom

    setViewport({ x, y, zoom })
  }, [])

  return {
    viewport,
    setViewport,
    screenToCanvas,
    handleWheel,
    startPan,
    onPanMove,
    endPan,
    zoomIn,
    zoomOut,
    fitToContent,
  }
}
