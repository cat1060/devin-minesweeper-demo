import { useRef, useCallback } from 'react'
import type { Cell as CellType } from '../../types/game'
import { FlagType } from '../../types/game'
import { adjacentMines } from '../../logic'
import styles from './Cell.module.css'

interface CellProps {
  cell: CellType
  row: number
  col: number
  board: CellType[][]
  isBoat: boolean
  gameOver: boolean
  onClick: (row: number, col: number) => void
  onRightClick: (row: number, col: number) => void
}

function getMineEmoji(minePower: number): string {
  if (minePower === 1) return '\uD83E\uDDE8'  // 🧨
  if (minePower === 2) return '\uD83D\uDCA3'  // 💣
  return '\uD83D\uDCA5'                        // 💥 (power 3)
}

function getCellContent(
  cell: CellType,
  board: CellType[][],
  row: number,
  col: number,
  gameOver: boolean,
): string {
  if (cell.isExploded) return getMineEmoji(cell.minePower)

  // Show unrevealed mines at game end
  if (gameOver && !cell.isRevealed && cell.minePower > 0) {
    return getMineEmoji(cell.minePower)
  }

  if (!cell.isRevealed) {
    if (cell.flagType === FlagType.FLAG) return '\uD83D\uDEA9'
    if (cell.flagType === FlagType.QUESTION) return '?'
    return ''
  }

  const count = adjacentMines(board, row, col)
  if (count > 0) return String(count)

  return ''
}

function getCellClassName(cell: CellType, isBoat: boolean, gameOver: boolean): string {
  const classes = [styles.cell]

  if (isBoat && cell.isExploded) {
    // Boat on an exploded mine: red background
    classes.push(styles.exploded)
  } else if (isBoat) {
    classes.push(styles.boat)
  } else if (cell.isExploded) {
    classes.push(styles.exploded)
  } else if (gameOver && !cell.isRevealed && cell.minePower > 0) {
    // Unrevealed mines at game end: gray background (not red)
    classes.push(styles.mineRevealed)
  } else if (!cell.isRevealed) {
    if (cell.flagType !== FlagType.NONE) {
      classes.push(styles.flagged)
    } else {
      classes.push(styles.hidden)
    }
  } else {
    classes.push(styles.revealed)
  }

  return classes.join(' ')
}

function getCountClass(
  cell: CellType,
  board: CellType[][],
  row: number,
  col: number,
): string {
  if (cell.isExploded || !cell.isRevealed) return ''

  const count = adjacentMines(board, row, col)
  if (count === 0) return ''

  const countStyles: Record<number, string> = {
    1: styles.count1,
    2: styles.count2,
    3: styles.count3,
    4: styles.count4,
    5: styles.count5,
    6: styles.count6,
    7: styles.count7,
    8: styles.count8,
  }

  return countStyles[count] || ''
}

export default function Cell({
  cell,
  row,
  col,
  board,
  isBoat,
  gameOver,
  onClick,
  onRightClick,
}: CellProps) {
  const content = getCellContent(cell, board, row, col, gameOver)
  const className = getCellClassName(cell, isBoat, gameOver)
  const countClass = getCountClass(cell, board, row, col)

  // Determine what to show in the bottom half when boat is on the cell
  const boatOnMine = isBoat && cell.isExploded
  const boatCount = isBoat && !boatOnMine ? adjacentMines(board, row, col) : 0
  const showSplit = isBoat && (boatCount > 0 || boatOnMine)

  // Track whether the touch moved far enough to be a swipe (not a tap).
  // A small tolerance (10px) avoids false positives from finger tremor.
  const TAP_MOVE_TOLERANCE = 10
  const touchMoved = useRef(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchMoved.current = false
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.touches[0]
    const dx = Math.abs(t.clientX - touchStart.current.x)
    const dy = Math.abs(t.clientY - touchStart.current.y)
    if (dx > TAP_MOVE_TOLERANCE || dy > TAP_MOVE_TOLERANCE) {
      touchMoved.current = true
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // If the finger moved, this is a swipe — let Board handle it
    if (touchMoved.current) return

    // Prevent the subsequent mouse click event from firing
    e.preventDefault()

    if (cell.isRevealed) {
      // Tap on revealed cell → teleport
      onClick(row, col)
    } else {
      // Tap on unrevealed cell → cycle flag
      onRightClick(row, col)
    }
  }, [cell.isRevealed, onClick, onRightClick, row, col])

  return (
    <div
      className={`${className} ${countClass}`.trim()}
      data-row={row}
      data-col={col}
      onClick={() => onClick(row, col)}
      onContextMenu={(e) => {
        e.preventDefault()
        onRightClick(row, col)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={-1}
      aria-label={`Cell ${row},${col}`}
    >
      {showSplit ? (
        <>
          <span className={styles.boatTop}>{"\u26F5"}</span>
          <span className={`${styles.boatBottom} ${boatOnMine ? '' : countClass}`.trim()}>
            {boatOnMine ? getMineEmoji(cell.minePower) : boatCount}
          </span>
        </>
      ) : (
        isBoat ? '\u26F5' : content
      )}
    </div>
  )
}
