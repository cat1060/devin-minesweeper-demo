import { describe, it, expect } from 'vitest'
import {
  nextFlagType,
  canFlag,
  isAdjacent,
  findRelocationTarget,
  flagCell,
} from './flagging'
import { createEmptyBoard } from './board'
import { FlagType, GameStatus } from '../types/game'
import type { GameState } from '../types/game'

describe('nextFlagType', () => {
  it('cycles NONE → FLAG', () => {
    expect(nextFlagType(FlagType.NONE)).toBe(FlagType.FLAG)
  })

  it('cycles FLAG → QUESTION', () => {
    expect(nextFlagType(FlagType.FLAG)).toBe(FlagType.QUESTION)
  })

  it('cycles QUESTION → NONE', () => {
    expect(nextFlagType(FlagType.QUESTION)).toBe(FlagType.NONE)
  })
})

describe('canFlag', () => {
  it('returns true when at least one adjacent cell is revealed', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].isRevealed = true

    // (2,1) is adjacent to revealed (2,2)
    expect(canFlag(board, 2, 1)).toBe(true)
    // (1,1) is diagonally adjacent to revealed (2,2)
    expect(canFlag(board, 1, 1)).toBe(true)
  })

  it('returns false when no adjacent cell is revealed', () => {
    const board = createEmptyBoard(5, 5)
    // No revealed cells
    expect(canFlag(board, 2, 2)).toBe(false)
  })

  it('returns false for already revealed cells', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].isRevealed = true
    board[2][3].isRevealed = true

    expect(canFlag(board, 2, 2)).toBe(false)
  })

  it('handles edge cells correctly', () => {
    const board = createEmptyBoard(5, 5)
    board[0][1].isRevealed = true

    // (0,0) is adjacent to revealed (0,1)
    expect(canFlag(board, 0, 0)).toBe(true)
  })

  it('returns false when only non-adjacent cells are revealed', () => {
    const board = createEmptyBoard(5, 5)
    board[4][4].isRevealed = true

    // (0,0) is far from revealed (4,4)
    expect(canFlag(board, 0, 0)).toBe(false)
  })
})

describe('isAdjacent', () => {
  it('returns true for cardinal neighbors', () => {
    expect(isAdjacent(2, 2, 1, 2)).toBe(true) // up
    expect(isAdjacent(2, 2, 3, 2)).toBe(true) // down
    expect(isAdjacent(2, 2, 2, 1)).toBe(true) // left
    expect(isAdjacent(2, 2, 2, 3)).toBe(true) // right
  })

  it('returns true for diagonal neighbors', () => {
    expect(isAdjacent(2, 2, 1, 1)).toBe(true)
    expect(isAdjacent(2, 2, 1, 3)).toBe(true)
    expect(isAdjacent(2, 2, 3, 1)).toBe(true)
    expect(isAdjacent(2, 2, 3, 3)).toBe(true)
  })

  it('returns false for same position', () => {
    expect(isAdjacent(2, 2, 2, 2)).toBe(false)
  })

  it('returns false for non-adjacent positions', () => {
    expect(isAdjacent(0, 0, 2, 2)).toBe(false)
    expect(isAdjacent(0, 0, 0, 2)).toBe(false)
    expect(isAdjacent(0, 0, 2, 0)).toBe(false)
  })
})

describe('findRelocationTarget', () => {
  it('prefers cardinal neighbors over diagonal', () => {
    const board = createEmptyBoard(5, 5)
    // Reveal a cardinal and a diagonal neighbor of (2,2)
    board[1][2].isRevealed = true // cardinal (up)
    board[1][1].isRevealed = true // diagonal

    const target = findRelocationTarget(board, 2, 2, () => 0)

    // Should pick from cardinal candidates
    expect(target).toEqual({ row: 1, col: 2 })
  })

  it('falls back to diagonal when no cardinal neighbors are revealed', () => {
    const board = createEmptyBoard(5, 5)
    board[1][1].isRevealed = true // diagonal only

    const target = findRelocationTarget(board, 2, 2, () => 0)

    expect(target).toEqual({ row: 1, col: 1 })
  })

  it('returns null when no revealed neighbors exist', () => {
    const board = createEmptyBoard(5, 5)

    const target = findRelocationTarget(board, 2, 2)

    expect(target).toBeNull()
  })

  it('excludes FLAG-type neighbors from candidates', () => {
    const board = createEmptyBoard(5, 5)
    board[1][2].isRevealed = true
    board[1][2].flagType = FlagType.FLAG
    board[3][2].isRevealed = true // another cardinal, not flagged

    const target = findRelocationTarget(board, 2, 2, () => 0)

    expect(target).toEqual({ row: 3, col: 2 })
  })

  it('allows QUESTION-type neighbors as candidates', () => {
    const board = createEmptyBoard(5, 5)
    board[1][2].isRevealed = true
    board[1][2].flagType = FlagType.QUESTION

    const target = findRelocationTarget(board, 2, 2, () => 0)

    expect(target).toEqual({ row: 1, col: 2 })
  })

  it('uses rng to select among multiple candidates', () => {
    const board = createEmptyBoard(5, 5)
    board[1][2].isRevealed = true // up
    board[3][2].isRevealed = true // down

    const target1 = findRelocationTarget(board, 2, 2, () => 0)
    expect(target1).toEqual({ row: 1, col: 2 })

    const target2 = findRelocationTarget(board, 2, 2, () => 0.99)
    expect(target2).toEqual({ row: 3, col: 2 })
  })
})

describe('flagCell', () => {
  function createTestState(): GameState {
    const board = createEmptyBoard(5, 5)
    // Reveal some cells to allow flagging
    board[2][2].isRevealed = true
    board[2][3].isRevealed = true
    board[1][2].isRevealed = true
    return {
      board,
      boatPosition: { row: 2, col: 2 },
      hp: 5,
      initialHp: 5,
      mineCount: 3,
      initialMineCount: 3,
      gameStatus: GameStatus.PLAYING,
    }
  }

  it('toggles flag from NONE to FLAG', () => {
    const state = createTestState()
    // (1,1) is adjacent to revealed (2,2) and (1,2)
    const result = flagCell(state, 1, 1)

    expect(result).not.toBeNull()
    expect(result!.board[1][1].flagType).toBe(FlagType.FLAG)
  })

  it('toggles flag from FLAG to QUESTION', () => {
    const state = createTestState()
    state.board[1][1].flagType = FlagType.FLAG

    const result = flagCell(state, 1, 1)

    expect(result).not.toBeNull()
    expect(result!.board[1][1].flagType).toBe(FlagType.QUESTION)
  })

  it('toggles flag from QUESTION to NONE', () => {
    const state = createTestState()
    state.board[1][1].flagType = FlagType.QUESTION

    const result = flagCell(state, 1, 1)

    expect(result).not.toBeNull()
    expect(result!.board[1][1].flagType).toBe(FlagType.NONE)
  })

  it('returns null for revealed cells', () => {
    const state = createTestState()
    const result = flagCell(state, 2, 2)

    expect(result).toBeNull()
  })

  it('allows flagging cells with no revealed neighbors', () => {
    const state = createTestState()
    const result = flagCell(state, 4, 4)

    expect(result).not.toBeNull()
    expect(result!.board[4][4].flagType).toBe(FlagType.FLAG)
  })

  it('allows unflagging cells with no revealed neighbors', () => {
    const state = createTestState()
    state.board[4][4].flagType = FlagType.FLAG

    const result = flagCell(state, 4, 4)
    expect(result).not.toBeNull()
    expect(result!.board[4][4].flagType).toBe(FlagType.QUESTION)
  })

  it('allows removing QUESTION even when no revealed neighbors exist', () => {
    const state = createTestState()
    state.board[4][4].flagType = FlagType.QUESTION

    const result = flagCell(state, 4, 4)
    expect(result).not.toBeNull()
    expect(result!.board[4][4].flagType).toBe(FlagType.NONE)
  })

  it('returns null when game is not PLAYING', () => {
    const state = createTestState()
    state.gameStatus = GameStatus.WON

    const result = flagCell(state, 1, 1)
    expect(result).toBeNull()
  })

  it('returns null for out-of-bounds positions', () => {
    const state = createTestState()

    expect(flagCell(state, -1, 0)).toBeNull()
    expect(flagCell(state, 0, 5)).toBeNull()
  })

  it('does not move boat when flagging any cell', () => {
    const state = createTestState()
    // Boat at (2,2), flagging (1,1) which is adjacent
    const result = flagCell(state, 1, 1)

    expect(result).not.toBeNull()
    expect(result!.boatPosition).toEqual({ row: 2, col: 2 })
  })

  it('does not move boat when flagging a remote cell', () => {
    const state = createTestState()
    // Boat at (2,2), flagging (0,4) — not adjacent
    const result = flagCell(state, 0, 4)

    expect(result).not.toBeNull()
    // Boat should stay at (2,2)
    expect(result!.boatPosition).toEqual({ row: 2, col: 2 })
  })

  it('does not mutate the original game state', () => {
    const state = createTestState()
    const originalBoard = state.board
    const originalFlag = state.board[1][1].flagType

    const result = flagCell(state, 1, 1)

    expect(result).not.toBeNull()
    expect(state.board).toBe(originalBoard)
    expect(state.board[1][1].flagType).toBe(originalFlag)
    expect(result!.board).not.toBe(state.board)
  })
})
