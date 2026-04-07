import { describe, it, expect } from 'vitest'
import {
  findStartingPosition,
  initializeGame,
  isInBounds,
  moveBoat,
  teleportBoat,
} from './navigation'
import { createEmptyBoard } from './board'
import { adjacentMines } from './cells'
import { FlagType, GameStatus } from '../types/game'
import type { GameState } from '../types/game'

describe('findStartingPosition', () => {
  it('returns a position with 0 adjacent mines', () => {
    const board = createEmptyBoard(5, 5)
    // Place a mine at (0,0) so not all cells have 0 adjacent mines
    board[0][0].minePower = 1

    const pos = findStartingPosition(board, () => 0)
    expect(pos).not.toBeNull()
    if (pos) {
      expect(board[pos.row][pos.col].minePower).toBe(0)
      expect(adjacentMines(board, pos.row, pos.col)).toBe(0)
    }
  })

  it('returns null when no cell has 0 adjacent mines', () => {
    // 2x2 board with 2 mines - every water cell has adjacent mines
    const board = createEmptyBoard(2, 2)
    board[0][0].minePower = 1
    board[1][1].minePower = 1

    const pos = findStartingPosition(board)
    expect(pos).toBeNull()
  })

  it('uses rng to select among candidates', () => {
    const board = createEmptyBoard(5, 5)
    // No mines, so all cells have 0 adjacent mines = 25 candidates
    // rng returning 0 should pick the first candidate
    const pos1 = findStartingPosition(board, () => 0)
    expect(pos1).toEqual({ row: 0, col: 0 })

    // rng returning 0.99 should pick a later candidate
    const pos2 = findStartingPosition(board, () => 0.99)
    expect(pos2).not.toEqual({ row: 0, col: 0 })
  })
})

describe('initializeGame', () => {
  it('creates a game state with correct properties', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const state = initializeGame(9, 9, 10, 5, rng)

    expect(state.board.length).toBe(9)
    expect(state.board[0].length).toBe(9)
    expect(state.hp).toBe(5)
    expect(state.mineCount).toBeGreaterThanOrEqual(10)
    expect(state.gameStatus).toBe(GameStatus.PLAYING)
  })

  it('places the boat on a cell with 0 adjacent mines', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const state = initializeGame(9, 9, 10, 5, rng)

    const { row, col } = state.boatPosition
    expect(state.board[row][col].minePower).toBe(0)
    expect(adjacentMines(state.board, row, col)).toBe(0)
  })

  it('reveals the starting cell and neighbors', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const state = initializeGame(9, 9, 10, 5, rng)

    const { row, col } = state.boatPosition
    expect(state.board[row][col].isRevealed).toBe(true)

    // Since starting cell has 0 adjacent mines, flood-fill should reveal neighbors
    let revealedCount = 0
    for (const r of state.board) {
      for (const c of r) {
        if (c.isRevealed) revealedCount++
      }
    }
    expect(revealedCount).toBeGreaterThan(1)
  })

  it('uses default HP of 5', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const state = initializeGame(9, 9, 10, undefined, rng)
    expect(state.hp).toBe(5)
  })

  it('accepts custom HP', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    const state = initializeGame(9, 9, 10, 10, rng)
    expect(state.hp).toBe(10)
  })
})

describe('isInBounds', () => {
  const board = createEmptyBoard(5, 5)

  it('returns true for valid positions', () => {
    expect(isInBounds(board, 0, 0)).toBe(true)
    expect(isInBounds(board, 4, 4)).toBe(true)
    expect(isInBounds(board, 2, 3)).toBe(true)
  })

  it('returns false for out-of-bounds positions', () => {
    expect(isInBounds(board, -1, 0)).toBe(false)
    expect(isInBounds(board, 0, -1)).toBe(false)
    expect(isInBounds(board, 5, 0)).toBe(false)
    expect(isInBounds(board, 0, 5)).toBe(false)
  })
})

describe('moveBoat', () => {
  function createTestState(): GameState {
    const board = createEmptyBoard(5, 5)
    board[2][2].isRevealed = true
    return {
      board,
      boatPosition: { row: 2, col: 2 },
      hp: 5,
      mineCount: 0,
      gameStatus: GameStatus.PLAYING,
    }
  }

  it('moves the boat up', () => {
    const state = createTestState()
    const result = moveBoat(state, 'up')
    expect(result).not.toBeNull()
    expect(result!.boatPosition).toEqual({ row: 1, col: 2 })
  })

  it('moves the boat down', () => {
    const state = createTestState()
    const result = moveBoat(state, 'down')
    expect(result).not.toBeNull()
    expect(result!.boatPosition).toEqual({ row: 3, col: 2 })
  })

  it('moves the boat left', () => {
    const state = createTestState()
    const result = moveBoat(state, 'left')
    expect(result).not.toBeNull()
    expect(result!.boatPosition).toEqual({ row: 2, col: 1 })
  })

  it('moves the boat right', () => {
    const state = createTestState()
    const result = moveBoat(state, 'right')
    expect(result).not.toBeNull()
    expect(result!.boatPosition).toEqual({ row: 2, col: 3 })
  })

  it('supports WASD keys', () => {
    const state = createTestState()
    expect(moveBoat(state, 'w')!.boatPosition).toEqual({ row: 1, col: 2 })
    expect(moveBoat(state, 'a')!.boatPosition).toEqual({ row: 2, col: 1 })
    expect(moveBoat(state, 's')!.boatPosition).toEqual({ row: 3, col: 2 })
    expect(moveBoat(state, 'd')!.boatPosition).toEqual({ row: 2, col: 3 })
  })

  it('supports Arrow keys', () => {
    const state = createTestState()
    expect(moveBoat(state, 'ArrowUp')!.boatPosition).toEqual({ row: 1, col: 2 })
    expect(moveBoat(state, 'ArrowLeft')!.boatPosition).toEqual({ row: 2, col: 1 })
    expect(moveBoat(state, 'ArrowDown')!.boatPosition).toEqual({ row: 3, col: 2 })
    expect(moveBoat(state, 'ArrowRight')!.boatPosition).toEqual({ row: 2, col: 3 })
  })

  it('returns null for out-of-bounds moves', () => {
    const state = createTestState()
    state.boatPosition = { row: 0, col: 0 }
    expect(moveBoat(state, 'up')).toBeNull()
    expect(moveBoat(state, 'left')).toBeNull()
  })

  it('returns null for invalid direction', () => {
    const state = createTestState()
    expect(moveBoat(state, 'diagonal')).toBeNull()
    expect(moveBoat(state, 'x')).toBeNull()
  })

  it('returns null when game is not PLAYING', () => {
    const state = createTestState()
    state.gameStatus = GameStatus.WON
    expect(moveBoat(state, 'up')).toBeNull()

    state.gameStatus = GameStatus.LOST
    expect(moveBoat(state, 'up')).toBeNull()
  })

  it('auto-reveals the destination cell', () => {
    const state = createTestState()
    expect(state.board[1][2].isRevealed).toBe(false)

    const result = moveBoat(state, 'up')
    expect(result).not.toBeNull()
    expect(result!.board[1][2].isRevealed).toBe(true)
  })

  it('flood-fills when moving to a cell with 0 adjacent mines', () => {
    const state = createTestState()
    // No mines on the board, so moving should flood-fill
    const result = moveBoat(state, 'up')
    expect(result).not.toBeNull()

    let revealedCount = 0
    for (const r of result!.board) {
      for (const c of r) {
        if (c.isRevealed) revealedCount++
      }
    }
    // Should reveal many cells via flood-fill
    expect(revealedCount).toBeGreaterThan(2)
  })

  it('does not mutate the original game state board', () => {
    const state = createTestState()
    const originalBoard = state.board
    const originalRevealed = state.board[1][2].isRevealed

    const result = moveBoat(state, 'up')
    expect(result).not.toBeNull()

    // Original state's board reference should be unchanged
    expect(state.board).toBe(originalBoard)
    // Original board cell should NOT have been mutated
    expect(state.board[1][2].isRevealed).toBe(originalRevealed)
    // New state should have a different board reference
    expect(result!.board).not.toBe(state.board)
    // New state's board should have the cell revealed
    expect(result!.board[1][2].isRevealed).toBe(true)
  })

  it('does not flood-fill when moving to a cell with adjacent mines', () => {
    const state = createTestState()
    // Place a mine at (0,2) so cell (1,2) has adjacent mines
    state.board[0][2].minePower = 1

    const result = moveBoat(state, 'up')
    expect(result).not.toBeNull()
    expect(result!.board[1][2].isRevealed).toBe(true)
  })
})

describe('teleportBoat', () => {
  function createTestState(): GameState {
    const board = createEmptyBoard(5, 5)
    board[0][0].isRevealed = true
    board[1][1].isRevealed = true
    board[2][2].isRevealed = true
    board[3][3].isRevealed = true
    return {
      board,
      boatPosition: { row: 2, col: 2 },
      hp: 5,
      mineCount: 0,
      gameStatus: GameStatus.PLAYING,
    }
  }

  it('teleports to a revealed unflagged cell', () => {
    const state = createTestState()
    const result = teleportBoat(state, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.boatPosition).toEqual({ row: 0, col: 0 })
  })

  it('teleports to a revealed cell with QUESTION flag', () => {
    const state = createTestState()
    state.board[1][1].flagType = FlagType.QUESTION
    const result = teleportBoat(state, 1, 1)
    expect(result).not.toBeNull()
    expect(result!.boatPosition).toEqual({ row: 1, col: 1 })
  })

  it('returns null for unrevealed cells', () => {
    const state = createTestState()
    const result = teleportBoat(state, 4, 4)
    expect(result).toBeNull()
  })

  it('returns null for flagged cells', () => {
    const state = createTestState()
    state.board[0][0].flagType = FlagType.FLAG
    const result = teleportBoat(state, 0, 0)
    expect(result).toBeNull()
  })

  it('returns null for out-of-bounds positions', () => {
    const state = createTestState()
    expect(teleportBoat(state, -1, 0)).toBeNull()
    expect(teleportBoat(state, 0, 5)).toBeNull()
  })

  it('returns null when teleporting to current position', () => {
    const state = createTestState()
    const result = teleportBoat(state, 2, 2)
    expect(result).toBeNull()
  })

  it('returns null when game is not PLAYING', () => {
    const state = createTestState()
    state.gameStatus = GameStatus.WON
    expect(teleportBoat(state, 0, 0)).toBeNull()

    state.gameStatus = GameStatus.LOST
    expect(teleportBoat(state, 0, 0)).toBeNull()
  })
})
