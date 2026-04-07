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
  onClick: (row: number, col: number) => void
  onRightClick: (row: number, col: number) => void
}

function getCellContent(
  cell: CellType,
  board: CellType[][],
  row: number,
  col: number,
): string {
  if (cell.isExploded) return '\uD83D\uDCA5'

  if (!cell.isRevealed) {
    if (cell.flagType === FlagType.FLAG) return '\uD83D\uDEA9'
    if (cell.flagType === FlagType.QUESTION) return '?'
    return ''
  }

  const count = adjacentMines(board, row, col)
  if (count > 0) return String(count)

  return ''
}

function getCellClassName(cell: CellType, isBoat: boolean): string {
  const classes = [styles.cell]

  if (isBoat) {
    classes.push(styles.boat)
  } else if (cell.isExploded) {
    classes.push(styles.exploded)
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
  onClick,
  onRightClick,
}: CellProps) {
  const content = getCellContent(cell, board, row, col)
  const className = getCellClassName(cell, isBoat)
  const countClass = getCountClass(cell, board, row, col)
  const boatCount = isBoat ? adjacentMines(board, row, col) : 0
  const showSplit = isBoat && boatCount > 0

  return (
    <div
      className={`${className} ${countClass}`.trim()}
      onClick={() => onClick(row, col)}
      onContextMenu={(e) => {
        e.preventDefault()
        onRightClick(row, col)
      }}
      role="button"
      tabIndex={-1}
      aria-label={`Cell ${row},${col}`}
    >
      {showSplit ? (
        <>
          <span className={styles.boatTop}>{"\u26F5"}</span>
          <span className={`${styles.boatBottom} ${countClass}`.trim()}>{boatCount}</span>
        </>
      ) : (
        isBoat ? '\u26F5' : content
      )}
    </div>
  )
}
