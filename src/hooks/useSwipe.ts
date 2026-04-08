import { useRef, useEffect } from 'react'

/**
 * Minimum distance (in px) a touch must travel to count as a swipe.
 * Prevents accidental swipes from small finger movements.
 */
const MIN_SWIPE_DISTANCE = 30

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

/**
 * Hook that detects swipe gestures on a touch surface.
 * Attaches native touch event listeners to the element referenced
 * by the provided ref.
 *
 * The callback receives one of 'up', 'down', 'left', 'right'.
 * Only fires if the swipe distance exceeds MIN_SWIPE_DISTANCE
 * and the primary axis of movement is clear (not diagonal).
 *
 * Only single-finger touches are treated as swipes. Multi-touch
 * gestures (pinch-zoom, two-finger pan) are left to the browser.
 * Single-finger swipes call preventDefault on touchmove to prevent
 * the browser from scrolling while the user is swiping to move.
 */
export function useSwipe(
  boardRef: React.RefObject<HTMLDivElement | null>,
  onSwipe: (direction: SwipeDirection) => void,
): void {
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const onSwipeRef = useRef(onSwipe)

  useEffect(() => {
    onSwipeRef.current = onSwipe
  }, [onSwipe])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return

    function handleTouchStart(e: TouchEvent) {
      // Only track single-finger touches for swipe detection.
      // Multi-touch (pinch-zoom, two-finger pan) is left to the browser.
      if (e.touches.length !== 1) {
        startPos.current = null
        return
      }
      const touch = e.touches[0]
      startPos.current = { x: touch.clientX, y: touch.clientY }
    }

    function handleTouchMove(e: TouchEvent) {
      // If a second finger is added, cancel the swipe and let browser
      // handle two-finger pan / pinch-zoom natively.
      if (e.touches.length > 1) {
        startPos.current = null
        return
      }

      // Single-finger: always prevent scrolling so the board doesn't
      // move under the finger. Two-finger scrolling still works because
      // the branch above exits without calling preventDefault.
      if (startPos.current) {
        e.preventDefault()
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!startPos.current) return

      const touch = e.changedTouches[0]
      const dx = touch.clientX - startPos.current.x
      const dy = touch.clientY - startPos.current.y
      startPos.current = null

      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // Must exceed minimum distance on at least one axis
      if (absDx < MIN_SWIPE_DISTANCE && absDy < MIN_SWIPE_DISTANCE) return

      // Determine primary direction (must be clearly dominant)
      if (absDx > absDy) {
        onSwipeRef.current(dx > 0 ? 'right' : 'left')
      } else {
        onSwipeRef.current(dy > 0 ? 'down' : 'up')
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
  }, [boardRef])
}
