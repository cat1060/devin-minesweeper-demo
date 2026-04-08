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
 * The wrapper element should have `touch-action: none` in CSS to
 * prevent the browser from intercepting touch events as scrolls.
 * The board scales to fit the viewport so scrolling is not needed.
 */
export function useSwipe(
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  onSwipe: (direction: SwipeDirection) => void,
): void {
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const onSwipeRef = useRef(onSwipe)

  useEffect(() => {
    onSwipeRef.current = onSwipe
  }, [onSwipe])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      startPos.current = { x: touch.clientX, y: touch.clientY }
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
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [wrapperRef])
}
