'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const TILE = 16
const GRAVITY = 0.35
const JUMP_FORCE = -7
const MOVE_SPEED = 1.6
const ACCEL = 0.15
const FRICTION = 0.85

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

// NES aspect ratio scaled to fill screen
function getGameDimensions() {
  if (typeof window === 'undefined') return { W: 512, H: 480, SCALE: 2, GROUND_Y: 480 - 48 }
  const w = window.innerWidth
  const h = window.innerHeight
  // Use native resolution, render at 1:1 pixel
  return { W: w, H: h, SCALE: 1, GROUND_Y: h - TILE * 3 }
}

function drawPixelMario(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, frame: number) {
  const s = 3 // pixel size within the character
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

function drawHillBg(ctx: CanvasRenderingContext2D, x: number, size: number, groundY: number) {
  ctx.fillStyle = '#00A800'
  ctx.beginPath()
  ctx.arc(x, groundY, size, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#80D010'
  ctx.beginPath()
  ctx.arc(x, groundY, size * 0.6, Math.PI, 0)
  ctx.fill()
}

// Sound effects
function playJumpSound(audioCtx: AudioContext) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15)
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.2)
}

function playPipeSound(audioCtx: AudioContext) {
  // The classic descending "womp womp womp" pipe entry
  const notes = [523, 440, 349, 294, 247, 196, 165]
  let t = audioCtx.currentTime
  for (const freq of notes) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + 0.13)
    t += 0.1
  }
}

function playCoinSound(audioCtx: AudioContext) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(988, audioCtx.currentTime)
  osc.frequency.setValueAtTime(1319, audioCtx.currentTime + 0.07)
  gain.gain.setValueAtTime(0.06, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.3)
}

// Simple SMB overworld melody using Web Audio
function playMarioTheme(audioCtx: AudioContext) {
  const notes: [number, number][] = [
    // E E _ E _ C E _ G _ _ _ G
    [659, 0.12], [659, 0.12], [0, 0.12], [659, 0.12], [0, 0.12], [523, 0.12],
    [659, 0.12], [0, 0.12], [784, 0.24], [0, 0.12], [392, 0.24], [0, 0.24],
    // C _ _ G _ _ E _ _ A _ B _ Bb A
    [523, 0.18], [0, 0.12], [392, 0.18], [0, 0.12], [330, 0.18], [0, 0.12],
    [440, 0.12], [0, 0.06], [494, 0.12], [0, 0.06], [466, 0.12], [440, 0.12],
    // G E G A _ F G _ E _ C D B
    [392, 0.15], [659, 0.15], [784, 0.15], [880, 0.12], [0, 0.06], [698, 0.12],
    [784, 0.12], [0, 0.06], [659, 0.12], [0, 0.06], [523, 0.12], [587, 0.12], [494, 0.12],
  ]

  let time = audioCtx.currentTime + 0.1
  for (const [freq, dur] of notes) {
    if (freq > 0) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.value = 0.06
      gain.gain.setValueAtTime(0.06, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(time)
      osc.stop(time + dur)
    }
    time += dur
  }
  return time - audioCtx.currentTime
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const [entered, setEntered] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const dimsRef = useRef(getGameDimensions())
  const gameRef = useRef<GameState>({
    x: 30, y: dimsRef.current.GROUND_Y - 39, vx: 0, vy: 0,
    grounded: true, facing: 1, frame: 0,
    entering: false, enterProgress: 0,
  })
  const keysRef = useRef<Set<string>>(new Set())
  const audioStarted = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const musicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const musicStoppedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const d = getGameDimensions()
      dimsRef.current = d
      canvas.width = d.W
      canvas.height = d.H
    }
    resize()
    window.addEventListener('resize', resize)

    // Start music on first interaction
    const startMusic = () => {
      if (audioStarted.current) return
      audioStarted.current = true
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const loopMusic = () => {
        if (musicStoppedRef.current) return
        const duration = playMarioTheme(audioCtx)
        musicTimerRef.current = setTimeout(loopMusic, duration * 1000 + 200)
      }
      loopMusic()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      startMusic()
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
      const { W, H, GROUND_Y } = dimsRef.current
      const PIPE_X = W / 2 - TILE
      const PIPE_TOP = GROUND_Y - TILE * 4

      if (g.entering) {
        g.enterProgress += 0.015
        if (g.enterProgress >= 1) {
          setEntered(true)
          return
        }
      } else {
        // Acceleration-based movement (feels like real Mario)
        const left = keys.has('ArrowLeft') || keys.has('a')
        const right = keys.has('ArrowRight') || keys.has('d')

        if (left) {
          g.vx -= ACCEL; g.facing = -1; g.frame++
          setShowHint(false)
        } else if (right) {
          g.vx += ACCEL; g.facing = 1; g.frame++
          setShowHint(false)
        } else {
          g.vx *= FRICTION
          if (Math.abs(g.vx) < 0.1) g.vx = 0
        }
        g.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, g.vx))

        if ((keys.has('ArrowUp') || keys.has(' ') || keys.has('w')) && g.grounded) {
          g.vy = JUMP_FORCE; g.grounded = false
          setShowHint(false)
          if (audioCtxRef.current) playJumpSound(audioCtxRef.current)
        }

        // Check if on pipe and pressing down
        const onPipe = g.x + 18 > PIPE_X - 4 && g.x + 18 < PIPE_X + TILE * 2 + 4 &&
          Math.abs((g.y + 39) - PIPE_TOP) < 4 && g.grounded
        if (onPipe && (keys.has('ArrowDown') || keys.has('s'))) {
          g.entering = true
          g.vx = 0
          g.x = PIPE_X + TILE - 18
          // Stop music, play pipe sound
          musicStoppedRef.current = true
          if (musicTimerRef.current) clearTimeout(musicTimerRef.current)
          if (audioCtxRef.current) playPipeSound(audioCtxRef.current)
        }

        // Physics
        g.vy += GRAVITY
        g.x += g.vx
        g.y += g.vy

        // Ground
        if (g.y + 39 >= GROUND_Y) { g.y = GROUND_Y - 39; g.vy = 0; g.grounded = true }

        // Pipe top
        if (g.x + 30 > PIPE_X - 4 && g.x + 6 < PIPE_X + TILE * 2 + 4 &&
            g.y + 39 >= PIPE_TOP && g.y + 39 - g.vy < PIPE_TOP + 2 && g.vy >= 0) {
          g.y = PIPE_TOP - 39; g.vy = 0; g.grounded = true
        }

        // Bounds
        if (g.x < 0) { g.x = 0; g.vx = 0 }
        if (g.x > W - 36) { g.x = W - 36; g.vx = 0 }
      }

      // RENDER
      ctx.imageSmoothingEnabled = false

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
      grad.addColorStop(0, '#4080FF')
      grad.addColorStop(1, SKY)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Hills (scaled to screen)
      drawHillBg(ctx, W * 0.12, W * 0.06, GROUND_Y)
      drawHillBg(ctx, W * 0.35, W * 0.03, GROUND_Y)
      drawHillBg(ctx, W * 0.75, W * 0.05, GROUND_Y)
      drawHillBg(ctx, W * 0.9, W * 0.025, GROUND_Y)

      // Clouds (spread across screen)
      for (let cx = W * 0.08; cx < W; cx += W * 0.22) {
        drawCloud(ctx, cx + Math.sin(cx) * 20, 40 + Math.cos(cx * 0.5) * 20)
      }

      // Ground
      ctx.fillStyle = GROUND_TOP
      ctx.fillRect(0, GROUND_Y, W, 4)
      ctx.fillStyle = GROUND_FILL
      ctx.fillRect(0, GROUND_Y + 4, W, H - GROUND_Y)
      ctx.fillStyle = '#E0A060'
      for (let gx = 0; gx < W; gx += TILE) {
        ctx.fillRect(gx + 2, GROUND_Y + 6, TILE - 4, 2)
        ctx.fillRect(gx + 8, GROUND_Y + 14, TILE - 4, 2)
      }

      // "PIPELINE PRO" in brick blocks
      const text = 'PIPELINE PRO'
      const blockSize = TILE
      const textWidth = text.length * (blockSize + 2)
      const textStartX = (W - textWidth) / 2
      const brickY = GROUND_Y - TILE * 6

      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === ' ') continue
        const bx = textStartX + i * (blockSize + 2)

        // Question block style for vowels, brick for consonants
        const isSpecial = 'AEIOU'.includes(ch)
        if (isSpecial) {
          ctx.fillStyle = '#FFB830'
          ctx.fillRect(bx, brickY, blockSize, blockSize)
          ctx.strokeStyle = '#C07000'
          ctx.lineWidth = 1
          ctx.strokeRect(bx + 0.5, brickY + 0.5, blockSize - 1, blockSize - 1)
        } else {
          ctx.fillStyle = BRICK
          ctx.fillRect(bx, brickY, blockSize, blockSize)
          ctx.strokeStyle = '#A03000'
          ctx.lineWidth = 1
          ctx.strokeRect(bx + 0.5, brickY + 0.5, blockSize - 1, blockSize - 1)
        }

        // Letter on each block
        ctx.fillStyle = '#FFF'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(ch, bx + blockSize / 2, brickY + blockSize - 4)
        ctx.textAlign = 'left'
      }

      // Pipe (centered)
      drawPipe(ctx, PIPE_X, PIPE_TOP, GROUND_Y - PIPE_TOP - TILE)

      // "PRESS DOWN" indicator
      const onPipeNow = g.x + 18 > PIPE_X - 4 && g.x + 18 < PIPE_X + TILE * 2 + 4 &&
        Math.abs((g.y + 39) - PIPE_TOP) < 4 && g.grounded && !g.entering
      if (onPipeNow) {
        const arrowY = PIPE_TOP - 24 + Math.sin(Date.now() / 200) * 4
        ctx.fillStyle = '#FFF'
        ctx.beginPath()
        ctx.moveTo(PIPE_X + TILE - 6, arrowY)
        ctx.lineTo(PIPE_X + TILE + 6, arrowY)
        ctx.lineTo(PIPE_X + TILE, arrowY + 10)
        ctx.fill()
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('PRESS DOWN', PIPE_X + TILE, arrowY - 6)
        ctx.textAlign = 'left'
      }

      // Mario
      if (g.entering) {
        const clipH = Math.max(0, 39 * (1 - g.enterProgress))
        ctx.save()
        ctx.beginPath()
        ctx.rect(g.x, g.y, 36, clipH)
        ctx.clip()
        drawPixelMario(ctx, g.x, g.y, g.facing, 0)
        ctx.restore()
      } else {
        drawPixelMario(ctx, g.x, g.y, g.facing, g.vx !== 0 ? g.frame : 0)
      }

      // HUD
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PIPELINE SIMULATOR', W / 2, 30)
      ctx.font = '10px monospace'
      ctx.fillStyle = '#FFD870'
      ctx.fillText('WORLD 1-1', W / 2, 46)
      ctx.textAlign = 'left'

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(hintTimer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', resize)
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
    <div className="fixed inset-0" style={{ background: '#000' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
      />

      {showHint && (
        <div className="fixed bottom-8 left-0 right-0 text-center animate-pulse">
          <p className="text-sm font-mono" style={{ color: '#FFD870' }}>
            Arrow keys to move. Space to jump. Down on pipe to enter.
          </p>
        </div>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        className="fixed bottom-3 right-4 text-[10px] font-mono px-3 py-1 rounded transition-colors z-10"
        style={{ color: '#555', border: '1px solid #333' }}
      >
        Skip
      </button>

      {entered && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white font-mono text-2xl mb-2 animate-pulse">ENTERING WORLD 1-1</p>
            <p className="text-gray-500 font-mono text-xs">Loading Pipeline Simulator...</p>
          </div>
        </div>
      )}
    </div>
  )
}
