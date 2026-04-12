import { useState, useRef, useEffect, useCallback } from 'react'

/** Cumulative midpoint movement (px) before locking as pan. */
const PAN_LOCK_THRESHOLD = 8

/** Cumulative distance change (px) before locking as pinch. */
const PINCH_LOCK_THRESHOLD = 8

/**
 * Hook that implements pinch-to-zoom on a scrollable container.
 *
 * Two-finger gestures are fully handled in JS:
 * - **Pan** (both fingers move together) → scrolls the container
 * - **Pinch** (fingers spread / contract) → adjusts zoom level
 *
 * Whichever threshold is crossed first (midpoint moved 8px = pan,
 * finger distance changed 8px = pinch) locks the gesture type for
 * the rest of the touch.  Pan never zooms; pinch zooms + pans.
 *
 * Returns the current scale and a resetZoom callback.
 * Apply the returned scale as `style={{ zoom: scale }}` on the
 * content inside the scrollable container.
 */
export function usePinchZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
): { scale: number; resetZoom: () => void } {
  const [scale, setScale] = useState(1)

  const pinchState = useRef<{
    initialDistance: number
    initialMidpoint: { x: number; y: number }
    lastDistance: number
    lastMidpoint: { x: number; y: number }
    gesture: 'undecided' | 'pan' | 'pinch'
  } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function getDistance(t1: Touch, t2: Touch): number {
      const dx = t1.clientX - t2.clientX
      const dy = t1.clientY - t2.clientY
      return Math.hypot(dx, dy)
    }

    function getMidpoint(t1: Touch, t2: Touch): { x: number; y: number } {
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      }
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const dist = getDistance(e.touches[0], e.touches[1])
        const mid = getMidpoint(e.touches[0], e.touches[1])
        pinchState.current = {
          initialDistance: dist,
          initialMidpoint: mid,
          lastDistance: dist,
          lastMidpoint: mid,
          gesture: 'undecided',
        }
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || !pinchState.current) return

      // Prevent browser-level zoom / scroll; we handle everything
      e.preventDefault()

      const dist = getDistance(e.touches[0], e.touches[1])
      const mid = getMidpoint(e.touches[0], e.touches[1])

      // Decide gesture type based on which threshold is hit first
      if (pinchState.current.gesture === 'undecided') {
        const cumulativeMidMove = Math.hypot(
          mid.x - pinchState.current.initialMidpoint.x,
          mid.y - pinchState.current.initialMidpoint.y,
        )
        const cumulativeDistChange = Math.abs(
          dist - pinchState.current.initialDistance,
        )

        if (
          cumulativeMidMove >= PAN_LOCK_THRESHOLD &&
          cumulativeMidMove >= cumulativeDistChange
        ) {
          pinchState.current.gesture = 'pan'
        } else if (cumulativeDistChange >= PINCH_LOCK_THRESHOLD) {
          pinchState.current.gesture = 'pinch'
        }
      }

      if (pinchState.current.gesture === 'pinch') {
        // Zoom only — no panning so the view doesn't drift while zooming
        const ratio = dist / pinchState.current.lastDistance
        setScale((prev) => Math.max(0.2, Math.min(3, prev * ratio)))
      } else {
        // Pan (scroll) only when gesture is pan or still undecided
        const dx = mid.x - pinchState.current.lastMidpoint.x
        const dy = mid.y - pinchState.current.lastMidpoint.y
        el!.scrollLeft -= dx
        el!.scrollTop -= dy
      }

      pinchState.current.lastDistance = dist
      pinchState.current.lastMidpoint = mid
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        pinchState.current = null
      }
    }

    el.addEventListener('touchstart', handleTouchStart)
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef])

  const resetZoom = useCallback(() => setScale(1), [])

  return { scale, resetZoom }
}
