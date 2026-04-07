import type { Cell, GameState, Position } from '../types/game'
import { FlagType, GameStatus } from '../types/game'
import { createBoard } from './board'
import { adjacentMines, revealCell } from './cells'

/**
 * Cardinal direction vectors for boat movement.
 */
const DIRECTION_MAP: Record<string, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
  w: [-1, 0],
  a: [0, -1],
  s: [1, 0],
  d: [0, 1],
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * Finds a random starting position: a water cell with 0 adjacent mines.
 * Returns null if no such cell exists (shouldn't happen with valid boards).
 */
export function findStartingPosition(
  board: Cell[][],
  rng: () => number = Math.random,
): Position | null {
  const candidates: Position[] = []
  const rows = board.length
  const cols = board[0].length

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].minePower === 0 && adjacentMines(board, r, c) === 0) {
        candidates.push({ row: r, col: c })
      }
    }
  }

  if (candidates.length === 0) return null

  const idx = Math.floor(rng() * candidates.length)
  return candidates[idx]
}

/**
 * Initializes a new game: creates the board, finds a starting position,
 * places the boat, and reveals the starting cell and its neighbors.
 */
export function initializeGame(
  rows: number,
  cols: number,
  mineCount: number,
  hp: number = 5,
  rng: () => number = Math.random,
): GameState {
  const { board, finalMineCount } = createBoard(rows, cols, mineCount, rng)

  const startPos = findStartingPosition(board, rng)
  if (!startPos) {
    throw new Error('No valid starting position found on the board')
  }

  // Reveal the starting cell (triggers flood-fill for 0-adjacent-mine cells)
  revealCell(board, startPos.row, startPos.col)

  return {
    board,
    boatPosition: startPos,
    hp,
    initialHp: hp,
    mineCount: finalMineCount,
    gameStatus: GameStatus.PLAYING,
  }
}

/**
 * Creates a deep copy of a board (new 2D array with cloned Cell objects).
 */
export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map(row => row.map(cell => ({ ...cell })))
}

/**
 * Checks if a position is within the board boundaries.
 */
export function isInBounds(board: Cell[][], row: number, col: number): boolean {
  return row >= 0 && row < board.length && col >= 0 && col < board[0].length
}

/**
 * Moves the boat in a cardinal direction. Auto-reveals the destination cell.
 * Returns the updated game state, or null if the move is invalid (out of bounds).
 *
 * Note: This function does NOT handle mine explosion damage.
 * Compose with handleMineStep() after calling this to process explosions.
 */
export function moveBoat(
  gameState: GameState,
  direction: string,
): GameState | null {
  if (gameState.gameStatus !== GameStatus.PLAYING) return null

  const delta = DIRECTION_MAP[direction]
  if (!delta) return null

  const [dr, dc] = delta
  const newRow = gameState.boatPosition.row + dr
  const newCol = gameState.boatPosition.col + dc

  if (!isInBounds(gameState.board, newRow, newCol)) return null

  // Deep-copy the board to avoid mutating the input state
  const newBoard = cloneBoard(gameState.board)

  // Auto-reveal the destination cell (flood-fill if 0 adjacent mines)
  revealCell(newBoard, newRow, newCol)

  return {
    ...gameState,
    board: newBoard,
    boatPosition: { row: newRow, col: newCol },
  }
}

/**
 * Teleports the boat to a target cell via mouse click.
 * Valid targets: revealed cells that are not flagged (NONE or QUESTION are OK).
 * Returns the updated game state, or null if the teleport is invalid.
 */
export function teleportBoat(
  gameState: GameState,
  row: number,
  col: number,
): GameState | null {
  if (gameState.gameStatus !== GameStatus.PLAYING) return null
  if (!isInBounds(gameState.board, row, col)) return null

  const cell = gameState.board[row][col]

  // Can only teleport to revealed cells that are not flagged
  if (!cell.isRevealed) return null
  if (cell.flagType === FlagType.FLAG) return null

  // Don't teleport to current position
  if (gameState.boatPosition.row === row && gameState.boatPosition.col === col) {
    return null
  }

  return {
    ...gameState,
    boatPosition: { row, col },
  }
}
