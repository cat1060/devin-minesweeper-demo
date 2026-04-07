import type { Cell, GameState } from '../types/game'
import { FlagType } from '../types/game'

/**
 * All 8 directions (cardinal + diagonal) for neighbor counting.
 */
const ALL_DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

/**
 * Counts the number of adjacent mines (all 8 neighbors) for a given cell.
 * This is a computed method, not a cached attribute.
 */
export function adjacentMines(board: Cell[][], row: number, col: number): number {
  const rows = board.length
  const cols = board[0].length
  let count = 0

  for (const [dr, dc] of ALL_DIRS) {
    const nr = row + dr
    const nc = col + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].minePower > 0) {
      count++
    }
  }

  return count
}

/**
 * Returns whether the boat is at the given cell position.
 */
export function hasBoat(gameState: GameState, row: number, col: number): boolean {
  return gameState.boatPosition.row === row && gameState.boatPosition.col === col
}

/**
 * Reveals a cell and performs flood-fill for cells with 0 adjacent mines.
 * Flood-fill expands in all 8 directions but stops at cells with adjacentMines > 0
 * (those cells are revealed but not recursed into).
 * Flagged cells are never revealed by flood-fill.
 * Returns the set of cells that were newly revealed.
 */
export function revealCell(
  board: Cell[][],
  row: number,
  col: number,
): Set<string> {
  const rows = board.length
  const cols = board[0].length
  const revealed = new Set<string>()

  const key = `${row},${col}`
  if (board[row][col].isRevealed || board[row][col].flagType !== FlagType.NONE) {
    return revealed
  }

  board[row][col].isRevealed = true
  revealed.add(key)

  // If this cell has adjacent mines, don't flood-fill
  if (adjacentMines(board, row, col) > 0) {
    return revealed
  }

  // If this cell is a mine, don't flood-fill
  if (board[row][col].minePower > 0) {
    return revealed
  }

  // BFS flood-fill for cells with 0 adjacent mines
  const queue: [number, number][] = [[row, col]]

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!

    for (const [dr, dc] of ALL_DIRS) {
      const nr = cr + dr
      const nc = cc + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue

      const nKey = `${nr},${nc}`
      if (revealed.has(nKey)) continue
      if (board[nr][nc].isRevealed) continue
      if (board[nr][nc].flagType !== FlagType.NONE) continue

      board[nr][nc].isRevealed = true
      revealed.add(nKey)

      // Only continue flood-fill if this neighbor also has 0 adjacent mines
      // and is not a mine itself
      if (board[nr][nc].minePower === 0 && adjacentMines(board, nr, nc) === 0) {
        queue.push([nr, nc])
      }
    }
  }

  return revealed
}
