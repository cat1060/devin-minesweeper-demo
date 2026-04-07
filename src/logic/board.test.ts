import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  randomMinePower,
  placeMines,
  findWaterComponents,
  fillInaccessibleCells,
  createBoard,
} from './board'
import { FlagType } from '../types/game'

describe('createEmptyBoard', () => {
  it('creates a board with the correct dimensions', () => {
    const board = createEmptyBoard(9, 9)
    expect(board.length).toBe(9)
    expect(board[0].length).toBe(9)
  })

  it('initializes all cells as unrevealed water with no flags', () => {
    const board = createEmptyBoard(3, 4)
    for (const row of board) {
      for (const cell of row) {
        expect(cell.minePower).toBe(0)
        expect(cell.isRevealed).toBe(false)
        expect(cell.flagType).toBe(FlagType.NONE)
        expect(cell.isExploded).toBe(false)
      }
    }
  })
})

describe('randomMinePower', () => {
  it('returns power 1 for rng values < 0.6', () => {
    expect(randomMinePower(() => 0)).toBe(1)
    expect(randomMinePower(() => 0.3)).toBe(1)
    expect(randomMinePower(() => 0.59)).toBe(1)
  })

  it('returns power 2 for rng values >= 0.6 and < 0.9', () => {
    expect(randomMinePower(() => 0.6)).toBe(2)
    expect(randomMinePower(() => 0.75)).toBe(2)
    expect(randomMinePower(() => 0.89)).toBe(2)
  })

  it('returns power 3 for rng values >= 0.9', () => {
    expect(randomMinePower(() => 0.9)).toBe(3)
    expect(randomMinePower(() => 0.95)).toBe(3)
    expect(randomMinePower(() => 0.99)).toBe(3)
  })
})

describe('placeMines', () => {
  it('places the correct number of mines', () => {
    const board = createEmptyBoard(9, 9)
    // Use a deterministic RNG
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    placeMines(board, 10, rng)

    let mineCount = 0
    for (const row of board) {
      for (const cell of row) {
        if (cell.minePower > 0) mineCount++
      }
    }
    expect(mineCount).toBe(10)
  })

  it('assigns power levels within valid range', () => {
    const board = createEmptyBoard(9, 9)
    let seed = 123
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    placeMines(board, 20, rng)

    for (const row of board) {
      for (const cell of row) {
        if (cell.minePower > 0) {
          expect(cell.minePower).toBeGreaterThanOrEqual(1)
          expect(cell.minePower).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('throws if mineCount exceeds total cells', () => {
    const board = createEmptyBoard(3, 3)
    expect(() => placeMines(board, 10)).toThrow()
  })
})

describe('findWaterComponents', () => {
  it('finds a single component when no mines exist', () => {
    const board = createEmptyBoard(3, 3)
    const components = findWaterComponents(board)
    expect(components.length).toBe(1)
    expect(components[0].size).toBe(9)
  })

  it('finds multiple components when mines isolate cells', () => {
    // Board layout (M = mine, . = water):
    // . M .
    // M M M
    // . M .
    const board = createEmptyBoard(3, 3)
    board[0][1].minePower = 1
    board[1][0].minePower = 1
    board[1][1].minePower = 1
    board[1][2].minePower = 1
    board[2][1].minePower = 1

    const components = findWaterComponents(board)
    // 4 isolated water cells (corners), each a separate component
    // since cardinal movement can't cross mines diagonally
    expect(components.length).toBe(4)
    for (const comp of components) {
      expect(comp.size).toBe(1)
    }
  })

  it('uses cardinal adjacency only (not diagonal)', () => {
    // Board layout:
    // . M
    // M .
    // The two water cells are diagonally adjacent but NOT cardinally adjacent
    const board = createEmptyBoard(2, 2)
    board[0][1].minePower = 1
    board[1][0].minePower = 1

    const components = findWaterComponents(board)
    expect(components.length).toBe(2)
  })

  it('groups cardinally connected water cells', () => {
    // Board layout:
    // . . M
    // . M M
    // M M M
    const board = createEmptyBoard(3, 3)
    board[0][2].minePower = 1
    board[1][1].minePower = 1
    board[1][2].minePower = 1
    board[2][0].minePower = 1
    board[2][1].minePower = 1
    board[2][2].minePower = 1

    const components = findWaterComponents(board)
    // (0,0), (0,1), (1,0) are cardinally connected
    expect(components.length).toBe(1)
    expect(components[0].size).toBe(3)
  })
})

describe('fillInaccessibleCells', () => {
  it('does nothing when there is only one component', () => {
    const board = createEmptyBoard(3, 3)
    const added = fillInaccessibleCells(board)
    expect(added).toBe(0)
  })

  it('converts isolated cells to mines', () => {
    // Board layout:
    // . . . . .
    // . . . . .
    // M M M M M
    // . M . M .
    // . M . M .
    const board = createEmptyBoard(5, 5)
    // Row 2 is all mines (wall)
    for (let c = 0; c < 5; c++) board[2][c].minePower = 1
    // Create isolated pockets in bottom section
    board[3][1].minePower = 1
    board[3][3].minePower = 1
    board[4][1].minePower = 1
    board[4][3].minePower = 1

    // Top section: 10 cells (largest)
    // Bottom-left pocket: (3,0), (4,0) = 2 cells
    // Bottom-center pocket: (3,2), (4,2) = 2 cells
    // Bottom-right pocket: (3,4), (4,4) = 2 cells
    const added = fillInaccessibleCells(board)
    expect(added).toBe(6) // 3 pockets × 2 cells each

    // Verify top section is still water
    expect(board[0][0].minePower).toBe(0)
    expect(board[1][2].minePower).toBe(0)

    // Verify bottom pockets are now mines
    expect(board[3][0].minePower).toBe(1)
    expect(board[4][0].minePower).toBe(1)
    expect(board[3][2].minePower).toBe(1)
    expect(board[4][2].minePower).toBe(1)
    expect(board[3][4].minePower).toBe(1)
    expect(board[4][4].minePower).toBe(1)
  })

  it('keeps the largest component intact', () => {
    // 1 large component of 6, 1 small of 1
    const board = createEmptyBoard(3, 3)
    // Isolate bottom-right corner
    board[1][2].minePower = 1
    board[2][1].minePower = 1

    const added = fillInaccessibleCells(board)
    // (2,2) is isolated: not cardinally reachable from the rest
    expect(added).toBe(1)
    expect(board[2][2].minePower).toBe(1)
    // The rest should remain water
    expect(board[0][0].minePower).toBe(0)
  })
})

describe('createBoard', () => {
  it('returns a board with correct dimensions', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const { board } = createBoard(9, 9, 10, rng)
    expect(board.length).toBe(9)
    expect(board[0].length).toBe(9)
  })

  it('returns finalMineCount >= initial mineCount', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const { finalMineCount } = createBoard(9, 9, 10, rng)
    expect(finalMineCount).toBeGreaterThanOrEqual(10)
  })

  it('has all water cells in a single connected component', () => {
    let seed = 99
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const { board } = createBoard(9, 9, 10, rng)

    const components = findWaterComponents(board)
    expect(components.length).toBeLessThanOrEqual(1)
  })
})
