import { type Cell, FlagType } from '../types/game'

/**
 * Creates an empty board with all cells initialized as unrevealed water.
 */
export function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): Cell => ({
      minePower: 0,
      isRevealed: false,
      flagType: FlagType.NONE,
      isExploded: false,
    }))
  )
}

/**
 * Generates a random mine power level based on the distribution:
 * 60% power-1, 30% power-2, 10% power-3.
 */
export function randomMinePower(rng: () => number = Math.random): number {
  const rand = rng()
  if (rand < 0.6) return 1
  if (rand < 0.9) return 2
  return 3
}

/**
 * Places mines randomly on the board and assigns power levels.
 * Returns the board with mines placed.
 */
export function placeMines(
  board: Cell[][],
  mineCount: number,
  rng: () => number = Math.random,
): Cell[][] {
  const rows = board.length
  const cols = board[0].length
  const totalCells = rows * cols

  if (mineCount > totalCells) {
    throw new Error(`Cannot place ${mineCount} mines on a ${rows}x${cols} board`)
  }

  // Build a shuffled list of all cell positions
  const positions: [number, number][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push([r, c])
    }
  }

  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]]
  }

  // Place mines in the first mineCount positions
  for (let i = 0; i < mineCount; i++) {
    const [r, c] = positions[i]
    board[r][c].minePower = randomMinePower(rng)
  }

  return board
}

/**
 * Cardinal directions (up, down, left, right) for movement/accessibility.
 *
 * NOTE: Water connectivity intentionally uses cardinal-only (4-dir) adjacency
 * because boat movement is cardinal. In contrast, `revealCell` in cells.ts uses
 * 8-directional adjacency for flood-fill (matching mine-counting). This means a
 * cell can be reachable via diagonal flood-fill reveal but still be considered
 * "inaccessible" by `fillInaccessibleCells`. Keep both systems in sync if
 * adjacency rules change.
 */
const CARDINAL_DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
]

/**
 * Finds all connected components of water (non-mine) cells using cardinal adjacency.
 * Returns an array of components, where each component is a set of "row,col" strings.
 */
export function findWaterComponents(board: Cell[][]): Set<string>[] {
  const rows = board.length
  const cols = board[0].length
  const visited = new Set<string>()
  const components: Set<string>[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`
      if (board[r][c].minePower > 0 || visited.has(key)) continue

      // BFS to find this connected component
      const component = new Set<string>()
      const queue: [number, number][] = [[r, c]]
      visited.add(key)

      while (queue.length > 0) {
        const [cr, cc] = queue.shift()!
        component.add(`${cr},${cc}`)

        for (const [dr, dc] of CARDINAL_DIRS) {
          const nr = cr + dr
          const nc = cc + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          const nKey = `${nr},${nc}`
          if (visited.has(nKey) || board[nr][nc].minePower > 0) continue
          visited.add(nKey)
          queue.push([nr, nc])
        }
      }

      components.push(component)
    }
  }

  return components
}

/**
 * Detects inaccessible water cells (cells not in the largest connected component)
 * and converts them to mines. Returns the number of new mines added.
 */
export function fillInaccessibleCells(board: Cell[][]): number {
  const components = findWaterComponents(board)

  if (components.length <= 1) return 0

  // Find the largest component
  let largestIdx = 0
  for (let i = 1; i < components.length; i++) {
    if (components[i].size > components[largestIdx].size) {
      largestIdx = i
    }
  }

  // Convert all cells not in the largest component to mines
  let added = 0
  for (let i = 0; i < components.length; i++) {
    if (i === largestIdx) continue
    for (const key of components[i]) {
      const [r, c] = key.split(',').map(Number)
      board[r][c].minePower = 1
      added++
    }
  }

  return added
}

/**
 * Creates a complete board: places mines, fills inaccessible cells, returns
 * the board and final mine count.
 */
export function createBoard(
  rows: number,
  cols: number,
  mineCount: number,
  rng: () => number = Math.random,
): { board: Cell[][]; finalMineCount: number } {
  const board = createEmptyBoard(rows, cols)
  placeMines(board, mineCount, rng)
  const addedMines = fillInaccessibleCells(board)
  return { board, finalMineCount: mineCount + addedMines }
}
