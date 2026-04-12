import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Minimum distance-change ratio before we classify a gesture as a
 * pinch rather than a pan.  A ratio of 1.0 means "no change".
 * Values within 1 ± PINCH_THRESHOLD are treated as pure pan.
 */
const PINCH_THRESHOLD = 0.06

/**
 * Hook that implements pinch-to-zoom on a scrollable container.
 *
 * Two-finger gestures are fully handled in JS:
 * - **Pan** (both fingers move together) → scrolls the container
 * - **Pinch** (fingers spread / contract) → adjusts zoom level
 *
 * The gesture type is detected on the first significant movement and
 * locked for the rest of the gesture so panning doesn't accidentally
 * zoom and vice-versa.
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

      // Decide gesture type once and lock it for this gesture
      if (pinchState.current.gesture === 'undecided') {
        const ratio = dist / pinchState.current.lastDistance
        if (Math.abs(ratio - 1) > PINCH_THRESHOLD) {
          pinchState.current.gesture = 'pinch'
        } else {
          // Check if midpoint moved enough to call it a pan
          const mdx = Math.abs(mid.x - pinchState.current.lastMidpoint.x)
          const mdy = Math.abs(mid.y - pinchState.current.lastMidpoint.y)
          if (mdx > 8 || mdy > 8) {
            pinchState.current.gesture = 'pan'
          }
        }
      }

      if (pinchState.current.gesture === 'pinch') {
        // Zoom: clamp between 0.2x and 3x
        const ratio = dist / pinchState.current.lastDistance
        setScale((prev) => Math.max(0.2, Math.min(3, prev * ratio)))
      }

      // Always pan (scroll) regardless of gesture type
      const dx = mid.x - pinchState.current.lastMidpoint.x
      const dy = mid.y - pinchState.current.lastMidpoint.y
      el!.scrollLeft -= dx
      el!.scrollTop -= dy

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
