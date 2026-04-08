import { useRef, useCallback } from 'react'

/**
 * Minimum distance (in px) a touch must travel to count as a swipe.
 * Prevents accidental swipes from small finger movements.
 */
const MIN_SWIPE_DISTANCE = 30

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

/**
 * Hook that detects swipe gestures on a touch surface.
 * Returns touch event handlers to attach to the target element.
 *
 * The callback receives one of 'up', 'down', 'left', 'right'.
 * Only fires if the swipe distance exceeds MIN_SWIPE_DISTANCE
 * and the primary axis of movement is clear (not diagonal).
 */
export function useSwipe(onSwipe: (direction: SwipeDirection) => void): SwipeHandlers {
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
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
      onSwipe(dx > 0 ? 'right' : 'left')
    } else {
      onSwipe(dy > 0 ? 'down' : 'up')
    }
  }, [onSwipe])

  return { onTouchStart, onTouchEnd }
}
