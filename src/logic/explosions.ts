import type { Cell, GameState, Position } from '../types/game'
import { GameStatus } from '../types/game'
import { cloneBoard, isInBounds } from './navigation'

export interface ExplosionResult {
  totalDamage: number
  explodedPositions: Position[]
}

/**
 * Returns the relative offsets for a mine's blast area based on its power.
 * - Power 1 (radius 0): only the mine's own cell
 * - Power 2 (radius 1): full 3×3 area
 * - Power 3 (radius 2): 5×5 area minus the 4 far corners
 *
 * General rule: radius = power - 1. All cells within Chebyshev distance ≤ radius
 * are included, except cells where both |dr| = radius AND |dc| = radius when
 * radius ≥ 2 (the "far corners").
 */
export function getBlastOffsets(power: number): [number, number][] {
  const radius = power - 1
  const offsets: [number, number][] = []

  for (let dr = 0 - radius; dr <= radius; dr++) {
    for (let dc = 0 - radius; dc <= radius; dc++) {
      if (radius >= 2 && Math.abs(dr) === radius && Math.abs(dc) === radius) {
        continue
      }
      offsets.push([dr, dc])
    }
  }

  return offsets
}

/**
 * Explodes a mine at (startRow, startCol) and triggers chain reactions via BFS.
 * Mutates the board in-place: marks exploded mines with isExploded = true and
 * isRevealed = true. Mines in the blast area of an exploding mine also explode.
 *
 * The boat takes damage from each explosion whose blast area covers the boat's
 * cell. Damage per explosion equals the exploding mine's power.
 */
export function explodeMines(
  board: Cell[][],
  startRow: number,
  startCol: number,
  boatRow: number,
  boatCol: number,
): ExplosionResult {
  const explodedPositions: Position[] = []
  let totalDamage = 0

  const queue: Position[] = [{ row: startRow, col: startCol }]
  const visited = new Set<string>()
  visited.add(`${startRow},${startCol}`)

  while (queue.length > 0) {
    const { row, col } = queue.shift()!
    const cell = board[row][col]

    if (cell.minePower === 0 || cell.isExploded) continue

    // Explode this mine
    cell.isExploded = true
    cell.isRevealed = true
    explodedPositions.push({ row, col })

    const offsets = getBlastOffsets(cell.minePower)
    let boatInBlast = false

    for (const [dr, dc] of offsets) {
      const nr = row + dr
      const nc = col + dc

      if (nr === boatRow && nc === boatCol) {
        boatInBlast = true
      }

      if (!isInBounds(board, nr, nc)) continue

      const target = board[nr][nc]
      const key = `${nr},${nc}`

      // Chain reaction: queue unexploded mines in the blast area
      if (target.minePower > 0 && !target.isExploded && !visited.has(key)) {
        visited.add(key)
        queue.push({ row: nr, col: nc })
      }
    }

    if (boatInBlast) {
      totalDamage += cell.minePower
    }
  }

  return { totalDamage, explodedPositions }
}

/**
 * Checks if the boat is on an unexploded mine and handles the explosion.
 * Deep-copies the board, runs explosion chain reactions, applies damage,
 * and checks for loss (HP ≤ 0).
 *
 * Returns the same state unchanged if no mine at boat position or mine
 * already exploded.
 */
export function handleMineStep(gameState: GameState): GameState {
  if (gameState.gameStatus !== GameStatus.PLAYING) return gameState

  const { row, col } = gameState.boatPosition
  const cell = gameState.board[row][col]

  if (cell.minePower === 0 || cell.isExploded) return gameState

  const newBoard = cloneBoard(gameState.board)

  const { totalDamage } = explodeMines(
    newBoard,
    row,
    col,
    row,
    col,
  )

  const newHp = gameState.hp - totalDamage
  const newStatus = newHp <= 0 ? GameStatus.LOST : GameStatus.PLAYING

  return {
    ...gameState,
    board: newBoard,
    hp: newHp,
    gameStatus: newStatus,
  }
}
