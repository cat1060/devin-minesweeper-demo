import type { Cell, GameState, Position } from '../types/game'
import { FlagType, GameStatus } from '../types/game'
import { cloneBoard, isInBounds } from './navigation'

/**
 * Cardinal directions (up, down, left, right) — preferred for boat relocation.
 */
const CARDINAL_DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
]

/**
 * Diagonal directions — used as fallback for boat relocation.
 */
const DIAGONAL_DIRS: [number, number][] = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
]

/**
 * Returns the next flag type in the ternary cycle: NONE → FLAG → QUESTION → NONE.
 */
export function nextFlagType(current: FlagType): FlagType {
  if (current === FlagType.NONE) return FlagType.FLAG
  if (current === FlagType.FLAG) return FlagType.QUESTION
  return FlagType.NONE
}

/**
 * Checks whether a cell can be flagged. A cell can be flagged if:
 * - It is not revealed (you only flag unrevealed cells)
 * - At least one of its 8 neighbors is revealed
 */
export function canFlag(board: Cell[][], row: number, col: number): boolean {
  if (board[row][col].isRevealed) return false

  const rows = board.length
  const cols = board[0].length
  const allDirs = [...CARDINAL_DIRS, ...DIAGONAL_DIRS]

  for (const [dr, dc] of allDirs) {
    const nr = row + dr
    const nc = col + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isRevealed) {
      return true
    }
  }

  return false
}

/**
 * Checks if two positions are adjacent (8-directional, Chebyshev distance ≤ 1).
 */
export function isAdjacent(
  row1: number,
  col1: number,
  row2: number,
  col2: number,
): boolean {
  const dr = Math.abs(row1 - row2)
  const dc = Math.abs(col1 - col2)
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)
}

/**
 * Finds a relocation target for the boat after flagging a remote cell.
 * Looks for a revealed, non-FLAG neighbor of the flagged cell.
 * Prefers cardinal neighbors over diagonal ones.
 * Returns null if no valid target exists (shouldn't happen given canFlag passed).
 */
export function findRelocationTarget(
  board: Cell[][],
  row: number,
  col: number,
  rng: () => number = Math.random,
): Position | null {
  const rows = board.length
  const cols = board[0].length

  const cardinalCandidates: Position[] = []
  const diagonalCandidates: Position[] = []

  for (const [dr, dc] of CARDINAL_DIRS) {
    const nr = row + dr
    const nc = col + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      const cell = board[nr][nc]
      if (cell.isRevealed && cell.flagType !== FlagType.FLAG) {
        cardinalCandidates.push({ row: nr, col: nc })
      }
    }
  }

  for (const [dr, dc] of DIAGONAL_DIRS) {
    const nr = row + dr
    const nc = col + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      const cell = board[nr][nc]
      if (cell.isRevealed && cell.flagType !== FlagType.FLAG) {
        diagonalCandidates.push({ row: nr, col: nc })
      }
    }
  }

  // Prefer cardinal neighbors
  if (cardinalCandidates.length > 0) {
    const idx = Math.floor(rng() * cardinalCandidates.length)
    return cardinalCandidates[idx]
  }

  if (diagonalCandidates.length > 0) {
    const idx = Math.floor(rng() * diagonalCandidates.length)
    return diagonalCandidates[idx]
  }

  return null
}

/**
 * Toggles the flag on a cell and handles boat relocation if needed.
 * - Cycles flag: NONE → FLAG → QUESTION → NONE
 * - Placing a new flag (NONE → FLAG) requires at least one revealed adjacent
 *   cell (canFlag). Cycling an existing flag (FLAG → QUESTION, QUESTION → NONE)
 *   always succeeds so the player is never stuck with an un-removable marker.
 * - If the boat is not adjacent to the flagged cell, relocates the boat
 *   to a revealed neighbor of the flagged cell (prefers cardinal)
 *
 * Returns the updated game state, or null if the action is invalid.
 */
export function flagCell(
  gameState: GameState,
  row: number,
  col: number,
  rng: () => number = Math.random,
): GameState | null {
  if (gameState.gameStatus !== GameStatus.PLAYING) return null
  if (!isInBounds(gameState.board, row, col)) return null

  const currentFlag = gameState.board[row][col].flagType
  // Adjacency check only applies when placing a new flag (NONE → FLAG).
  // Cycling an existing flag always succeeds so the player can always unflag.
  if (currentFlag === FlagType.NONE && !canFlag(gameState.board, row, col)) return null
  // Revealed cells can never be flagged regardless of transition
  if (gameState.board[row][col].isRevealed) return null

  const newBoard = cloneBoard(gameState.board)
  const cell = newBoard[row][col]
  cell.flagType = nextFlagType(cell.flagType)

  let newBoatPosition = gameState.boatPosition

  // Relocate boat if it's not adjacent to the flagged cell
  if (!isAdjacent(gameState.boatPosition.row, gameState.boatPosition.col, row, col)) {
    const target = findRelocationTarget(newBoard, row, col, rng)
    if (target) {
      newBoatPosition = target
    }
  }

  return {
    ...gameState,
    board: newBoard,
    boatPosition: newBoatPosition,
  }
}
