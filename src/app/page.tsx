'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const SCALE = 3
const TILE = 16
const W = 256
const H = 240
const GRAVITY = 0.5
const JUMP_FORCE = -8
const MOVE_SPEED = 2.5
const GROUND_Y = H - TILE * 3

// Colors
const SKY = '#5C94FC'
const GROUND_TOP = '#C84C0C'
const GROUND_FILL = '#D07030'
const BRICK = '#C84C0C'
const PIPE_GREEN = '#00A800'
const PIPE_DARK = '#005800'
const PIPE_LIGHT = '#80D010'
const MARIO_RED = '#B81810'
const MARIO_SKIN = '#FC9838'
const MARIO_BROWN = '#6C3400'
const CLOUD_WHITE = '#FCFCFC'

interface GameState {
  x: number
  y: number
  vx: number
  vy: number
  grounded: boolean
  facing: 1 | -1
  frame: number
  entering: boolean
  enterProgress: number
}

function drawPixelMario(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, frame: number) {
  const s = 2 // pixel size within the character
  const draw = (px: number, py: number, color: string) => {
    ctx.fillStyle = color
    const fx = facing === 1 ? px : 11 - px
    ctx.fillRect(x + fx * s, y + py * s, s, s)
  }

  // Hat
  for (let i = 3; i < 8; i++) draw(i, 0, MARIO_RED)
  for (let i = 2; i < 11; i++) draw(i, 1, MARIO_RED)

  // Hair + face
  for (let i = 2; i < 5; i++) draw(i, 2, MARIO_BROWN)
  draw(5, 2, MARIO_SKIN); draw(6, 2, MARIO_SKIN); draw(7, 2, MARIO_BROWN); draw(8, 2, MARIO_SKIN)
  draw(2, 3, MARIO_BROWN); draw(3, 3, MARIO_SKIN); draw(4, 3, MARIO_BROWN)
  draw(5, 3, MARIO_SKIN); draw(6, 3, MARIO_SKIN); draw(7, 3, MARIO_SKIN); draw(8, 3, MARIO_SKIN); draw(9, 3, MARIO_SKIN)
  draw(2, 4, MARIO_BROWN); draw(3, 4, MARIO_SKIN); draw(4, 4, MARIO_BROWN); draw(5, 4, MARIO_BROWN)
  draw(6, 4, MARIO_SKIN); draw(7, 4, MARIO_SKIN); draw(8, 4, MARIO_SKIN); draw(9, 4, MARIO_SKIN); draw(10, 4, MARIO_SKIN)
  draw(2, 5, MARIO_BROWN); draw(3, 5, MARIO_BROWN); draw(4, 5, MARIO_SKIN); draw(5, 5, MARIO_SKIN)
  draw(6, 5, MARIO_SKIN); draw(7, 5, MARIO_SKIN); draw(8, 5, MARIO_BROWN)
  for (let i = 3; i < 9; i++) draw(i, 6, MARIO_SKIN)

  // Body
  draw(3, 7, MARIO_RED); draw(4, 7, MARIO_RED); draw(5, 7, '#3C68E8'); draw(6, 7, MARIO_RED); draw(7, 7, MARIO_RED)
  draw(2, 8, MARIO_RED); draw(3, 8, MARIO_RED); draw(4, 8, MARIO_RED); draw(5, 8, '#3C68E8')
  draw(6, 8, MARIO_RED); draw(7, 8, MARIO_RED); draw(8, 8, MARIO_RED)

  // Overalls
  draw(2, 9, MARIO_RED); draw(3, 9, MARIO_RED); draw(4, 9, '#3C68E8'); draw(5, 9, '#3C68E8'); draw(6, 9, '#3C68E8')
  draw(7, 9, MARIO_RED); draw(8, 9, MARIO_RED)
  draw(3, 10, '#3C68E8'); draw(4, 10, '#3C68E8'); draw(5, 10, '#3C68E8'); draw(6, 10, '#3C68E8')
  draw(7, 10, '#3C68E8')

  // Legs
  const walkOffset = Math.sin(frame * 0.3) > 0 ? 1 : 0
  if (walkOffset && Math.abs(facing) > 0) {
    draw(2, 11, MARIO_BROWN); draw(3, 11, MARIO_BROWN); draw(4, 11, MARIO_BROWN)
    draw(7, 11, MARIO_BROWN); draw(8, 11, MARIO_BROWN)
    draw(1, 12, MARIO_BROWN); draw(2, 12, MARIO_BROWN); draw(3, 12, MARIO_BROWN)
    draw(8, 12, MARIO_BROWN); draw(9, 12, MARIO_BROWN); draw(10, 12, MARIO_BROWN)
  } else {
    draw(3, 11, MARIO_BROWN); draw(4, 11, MARIO_BROWN); draw(6, 11, MARIO_BROWN); draw(7, 11, MARIO_BROWN)
    draw(2, 12, MARIO_BROWN); draw(3, 12, MARIO_BROWN); draw(4, 12, MARIO_BROWN)
    draw(7, 12, MARIO_BROWN); draw(8, 12, MARIO_BROWN); draw(9, 12, MARIO_BROWN)
  }
}

function drawPipe(ctx: CanvasRenderingContext2D, px: number, py: number, height: number) {
  // Pipe rim
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(px - 4, py, TILE * 2 + 8, TILE)
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(px - 2, py + 2, TILE * 2 + 4, TILE - 4)
  ctx.fillStyle = PIPE_LIGHT
  ctx.fillRect(px, py + 2, 4, TILE - 4)

  // Pipe body
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(px, py + TILE, TILE * 2, height)
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(px + 2, py + TILE, TILE * 2 - 4, height)
  ctx.fillStyle = PIPE_LIGHT
  ctx.fillRect(px + 2, py + TILE, 4, height)
}

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = CLOUD_WHITE
  ctx.beginPath()
  ctx.arc(cx, cy, 12, 0, Math.PI * 2)
  ctx.arc(cx - 14, cy + 2, 9, 0, Math.PI * 2)
  ctx.arc(cx + 14, cy + 2, 9, 0, Math.PI * 2)
  ctx.arc(cx - 7, cy - 6, 8, 0, Math.PI * 2)
  ctx.arc(cx + 7, cy - 6, 8, 0, Math.PI * 2)
  ctx.fill()
}

function drawHillBg(ctx: CanvasRenderingContext2D, x: number, size: number) {
  ctx.fillStyle = '#00A800'
  ctx.beginPath()
  ctx.arc(x, GROUND_Y, size, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#80D010'
  ctx.beginPath()
  ctx.arc(x, GROUND_Y, size * 0.6, Math.PI, 0)
  ctx.fill()
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const [entered, setEntered] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const gameRef = useRef<GameState>({
    x: 30, y: GROUND_Y - 26, vx: 0, vy: 0,
    grounded: true, facing: 1, frame: 0,
    entering: false, enterProgress: 0,
  })
  const keysRef = useRef<Set<string>>(new Set())

  const PIPE_X = W / 2 - TILE
  const PIPE_TOP = GROUND_Y - TILE * 3

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = W
    canvas.height = H

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    let hintTimer = setTimeout(() => setShowHint(true), 3000)

    let raf: number
    const loop = () => {
      const g = gameRef.current
      const keys = keysRef.current

      if (g.entering) {
        g.enterProgress += 0.02
        if (g.enterProgress >= 1) {
          setEntered(true)
          return
        }
      } else {
        // Input
        if (keys.has('ArrowLeft') || keys.has('a')) {
          g.vx = -MOVE_SPEED; g.facing = -1; g.frame++
          setShowHint(false)
        } else if (keys.has('ArrowRight') || keys.has('d')) {
          g.vx = MOVE_SPEED; g.facing = 1; g.frame++
          setShowHint(false)
        } else {
          g.vx = 0
        }

        if ((keys.has('ArrowUp') || keys.has(' ') || keys.has('w')) && g.grounded) {
          g.vy = JUMP_FORCE; g.grounded = false
          setShowHint(false)
        }

        // Check if on pipe and pressing down
        const onPipe = g.x + 12 > PIPE_X - 4 && g.x + 12 < PIPE_X + TILE * 2 + 4 &&
          Math.abs((g.y + 26) - PIPE_TOP) < 4 && g.grounded
        if (onPipe && (keys.has('ArrowDown') || keys.has('s'))) {
          g.entering = true
          g.vx = 0
          g.x = PIPE_X + TILE - 12
        }

        // Physics
        g.vy += GRAVITY
        g.x += g.vx
        g.y += g.vy

        // Ground collision
        if (g.y + 26 >= GROUND_Y) {
          g.y = GROUND_Y - 26; g.vy = 0; g.grounded = true
        }

        // Pipe top collision
        if (g.x + 20 > PIPE_X - 4 && g.x + 4 < PIPE_X + TILE * 2 + 4 &&
            g.y + 26 >= PIPE_TOP && g.y + 26 - g.vy < PIPE_TOP + 2 && g.vy >= 0) {
          g.y = PIPE_TOP - 26; g.vy = 0; g.grounded = true
        }

        // Bounds
        if (g.x < 0) g.x = 0
        if (g.x > W - 24) g.x = W - 24
      }

      // RENDER
      ctx.imageSmoothingEnabled = false

      // Sky
      ctx.fillStyle = SKY
      ctx.fillRect(0, 0, W, H)

      // Hills
      drawHillBg(ctx, 50, 40)
      drawHillBg(ctx, 200, 25)

      // Clouds
      drawCloud(ctx, 60, 50)
      drawCloud(ctx, 150, 35)
      drawCloud(ctx, 220, 55)

      // Ground
      ctx.fillStyle = GROUND_TOP
      ctx.fillRect(0, GROUND_Y, W, 4)
      ctx.fillStyle = GROUND_FILL
      ctx.fillRect(0, GROUND_Y + 4, W, H - GROUND_Y)

      // Ground pattern
      ctx.fillStyle = '#E0A060'
      for (let gx = 0; gx < W; gx += TILE) {
        ctx.fillRect(gx + 2, GROUND_Y + 6, TILE - 4, 2)
        ctx.fillRect(gx + 8, GROUND_Y + 12, TILE - 4, 2)
      }

      // Some floating bricks
      ctx.fillStyle = BRICK
      for (const bx of [64, 80, 96]) {
        ctx.fillRect(bx, GROUND_Y - TILE * 4, TILE, TILE)
        ctx.strokeStyle = '#A03000'
        ctx.lineWidth = 1
        ctx.strokeRect(bx + 0.5, GROUND_Y - TILE * 4 + 0.5, TILE - 1, TILE - 1)
        ctx.fillStyle = '#FFD870'
        ctx.fillRect(bx + 3, GROUND_Y - TILE * 4 + 3, 4, 4)
        ctx.fillStyle = BRICK
      }

      // Question block
      const qbX = 160
      const qbY = GROUND_Y - TILE * 4
      ctx.fillStyle = '#FFB830'
      ctx.fillRect(qbX, qbY, TILE, TILE)
      ctx.strokeStyle = '#C07000'
      ctx.lineWidth = 1
      ctx.strokeRect(qbX + 0.5, qbY + 0.5, TILE - 1, TILE - 1)
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 10px monospace'
      ctx.fillText('?', qbX + 4, qbY + 12)

      // Pipe
      drawPipe(ctx, PIPE_X, PIPE_TOP, GROUND_Y - PIPE_TOP - TILE)

      // "DOWN" arrow indicator when on pipe
      const onPipeNow = g.x + 12 > PIPE_X - 4 && g.x + 12 < PIPE_X + TILE * 2 + 4 &&
        Math.abs((g.y + 26) - PIPE_TOP) < 4 && g.grounded && !g.entering
      if (onPipeNow) {
        const arrowY = PIPE_TOP - 20 + Math.sin(Date.now() / 200) * 3
        ctx.fillStyle = '#FFF'
        ctx.beginPath()
        ctx.moveTo(PIPE_X + TILE - 5, arrowY)
        ctx.lineTo(PIPE_X + TILE + 5, arrowY)
        ctx.lineTo(PIPE_X + TILE, arrowY + 8)
        ctx.fill()
      }

      // Mario (with enter animation)
      if (g.entering) {
        const clipH = Math.max(0, 26 * (1 - g.enterProgress))
        ctx.save()
        ctx.beginPath()
        ctx.rect(g.x, g.y, 24, clipH)
        ctx.clip()
        drawPixelMario(ctx, g.x, g.y, g.facing, 0)
        ctx.restore()
      } else {
        drawPixelMario(ctx, g.x, g.y, g.facing, g.vx !== 0 ? g.frame : 0)
      }

      // Title text
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PIPELINE SIMULATOR', W / 2, 22)
      ctx.font = '7px monospace'
      ctx.fillStyle = '#FFD870'
      ctx.fillText('RUN TO THE PIPE. PRESS DOWN.', W / 2, 34)
      ctx.textAlign = 'left'

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(hintTimer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Navigate after enter animation
  useEffect(() => {
    if (entered) {
      const t = setTimeout(() => router.push('/dashboard'), 500)
      return () => clearTimeout(t)
    }
  }, [entered, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{ width: W * SCALE, height: H * SCALE, imageRendering: 'pixelated' }}
        className="border-4 border-gray-800 rounded-lg"
      />

      {showHint && (
        <div className="mt-4 text-center animate-pulse">
          <p className="text-sm font-mono" style={{ color: '#FFD870' }}>
            Arrow keys to move. Space to jump. Down on pipe to enter.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[10px] font-mono px-3 py-1 rounded transition-colors"
          style={{ color: '#666', border: '1px solid #333' }}
        >
          Skip
        </button>
      </div>

      {entered && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-pulse">
          <p className="text-white font-mono text-lg">ENTERING WORLD 1-1...</p>
        </div>
      )}
    </div>
  )
}
