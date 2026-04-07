import { describe, it, expect } from 'vitest'
import {
  getBlastOffsets,
  explodeMines,
  handleMineStep,
} from './explosions'
import { createEmptyBoard } from './board'
import { GameStatus } from '../types/game'
import type { GameState } from '../types/game'

describe('getBlastOffsets', () => {
  it('returns only the center for power 1', () => {
    const offsets = getBlastOffsets(1)
    expect(offsets).toEqual([[0, 0]])
  })

  it('returns full 3x3 for power 2', () => {
    const offsets = getBlastOffsets(2)
    expect(offsets).toHaveLength(9)
    // Corners should be included
    expect(offsets).toContainEqual([-1, -1])
    expect(offsets).toContainEqual([-1, 1])
    expect(offsets).toContainEqual([1, -1])
    expect(offsets).toContainEqual([1, 1])
    // Center
    expect(offsets).toContainEqual([0, 0])
  })

  it('returns 5x5 minus 4 far corners for power 3', () => {
    const offsets = getBlastOffsets(3)
    // 5x5 = 25, minus 4 corners = 21
    expect(offsets).toHaveLength(21)
    // Far corners should be excluded
    expect(offsets).not.toContainEqual([-2, -2])
    expect(offsets).not.toContainEqual([-2, 2])
    expect(offsets).not.toContainEqual([2, -2])
    expect(offsets).not.toContainEqual([2, 2])
    // Near corners (radius 1) should be included
    expect(offsets).toContainEqual([-1, -1])
    expect(offsets).toContainEqual([1, 1])
    // Edge cells should be included
    expect(offsets).toContainEqual([-2, -1])
    expect(offsets).toContainEqual([-2, 0])
    expect(offsets).toContainEqual([-2, 1])
  })
})

describe('explodeMines', () => {
  it('explodes a power-1 mine with no splash', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 1
    board[2][3].minePower = 1 // adjacent mine should NOT chain

    const result = explodeMines(board, 2, 2, 2, 2)

    expect(result.explodedPositions).toEqual([{ row: 2, col: 2 }])
    expect(board[2][2].isExploded).toBe(true)
    expect(board[2][2].isRevealed).toBe(true)
    // Adjacent mine should NOT be triggered (power-1 has no splash)
    expect(board[2][3].isExploded).toBe(false)
  })

  it('explodes a power-2 mine in 3x3 area and chains adjacent mines', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 2
    board[1][1].minePower = 1 // in 3x3 blast area, should chain

    const result = explodeMines(board, 2, 2, 0, 0)

    expect(board[2][2].isExploded).toBe(true)
    expect(board[1][1].isExploded).toBe(true)
    expect(result.explodedPositions).toHaveLength(2)
  })

  it('explodes a power-3 mine in diamond pattern excluding far corners', () => {
    const board = createEmptyBoard(7, 7)
    board[3][3].minePower = 3
    // Place mines at far corners — should NOT chain
    board[1][1].minePower = 1 // (-2,-2) = far corner
    board[1][5].minePower = 1 // (-2,+2) = far corner
    // Place mine at near edge — should chain
    board[1][2].minePower = 1 // (-2,-1) = in blast area

    const result = explodeMines(board, 3, 3, 0, 0)

    expect(board[3][3].isExploded).toBe(true)
    expect(board[1][2].isExploded).toBe(true) // in blast area
    expect(board[1][1].isExploded).toBe(false) // far corner, excluded
    expect(board[1][5].isExploded).toBe(false) // far corner, excluded
    expect(result.explodedPositions).toHaveLength(2)
  })

  it('triggers chain reactions recursively', () => {
    const board = createEmptyBoard(5, 5)
    board[2][0].minePower = 2 // explodes 3x3, reaches (2,1)
    board[2][1].minePower = 2 // chains, explodes 3x3, reaches (2,2)
    board[2][2].minePower = 1 // chains from (2,1)

    const result = explodeMines(board, 2, 0, 4, 4)

    expect(board[2][0].isExploded).toBe(true)
    expect(board[2][1].isExploded).toBe(true)
    expect(board[2][2].isExploded).toBe(true)
    expect(result.explodedPositions).toHaveLength(3)
  })

  it('calculates boat damage when boat is at the exploding mine', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 2

    const result = explodeMines(board, 2, 2, 2, 2)

    // Boat is at the mine cell, which is in the blast area
    expect(result.totalDamage).toBe(2)
  })

  it('calculates boat damage when boat is in blast radius', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 2 // 3x3 blast area

    // Boat is at (2,3), which is in the 3x3 area centered on (2,2)
    const result = explodeMines(board, 2, 2, 2, 3)

    expect(result.totalDamage).toBe(2)
  })

  it('does not damage boat outside blast radius', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 1 // power-1, only affects own cell

    // Boat is at (0,0), not in blast area
    const result = explodeMines(board, 2, 2, 0, 0)

    expect(result.totalDamage).toBe(0)
  })

  it('accumulates damage from chain reactions covering the boat', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 2 // power 2, 3x3 blast
    board[2][3].minePower = 1 // in blast area, chains, power 1

    // Boat is at (2,2) — in blast area of the power-2 mine
    // and also at the center of its own cell
    const result = explodeMines(board, 2, 2, 2, 2)

    // Power-2 mine blast covers boat: +2
    // Power-1 mine at (2,3) blast is only (2,3), boat at (2,2) not covered: +0
    expect(result.totalDamage).toBe(2)
  })

  it('accumulates damage when boat is in multiple blast areas', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 2 // 3x3 blast covers (2,3)
    board[2][3].minePower = 2 // chains, 3x3 blast also covers (2,2)

    // Boat at (2,2): in blast of mine at (2,2) AND mine at (2,3)
    const result = explodeMines(board, 2, 2, 2, 2)

    expect(result.totalDamage).toBe(4) // 2 + 2
  })

  it('does not re-explode already exploded mines', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 2
    board[2][2].isExploded = true // already exploded

    const result = explodeMines(board, 2, 2, 2, 2)

    expect(result.explodedPositions).toHaveLength(0)
    expect(result.totalDamage).toBe(0)
  })

  it('marks exploded mines as revealed', () => {
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 1
    expect(board[2][2].isRevealed).toBe(false)

    explodeMines(board, 2, 2, 0, 0)

    expect(board[2][2].isRevealed).toBe(true)
    expect(board[2][2].isExploded).toBe(true)
  })

  it('handles mines at board edges without going out of bounds', () => {
    const board = createEmptyBoard(5, 5)
    board[0][0].minePower = 3 // power-3 at corner, blast extends beyond board

    const result = explodeMines(board, 0, 0, 4, 4)

    expect(board[0][0].isExploded).toBe(true)
    expect(result.explodedPositions).toHaveLength(1)
    // Should not throw
  })
})

describe('handleMineStep', () => {
  function createTestState(): GameState {
    const board = createEmptyBoard(5, 5)
    return {
      board,
      boatPosition: { row: 2, col: 2 },
      hp: 5,
      initialHp: 5,
      mineCount: 0,
      initialMineCount: 0,
      gameStatus: GameStatus.PLAYING,
    }
  }

  it('returns same state when no mine at boat position', () => {
    const state = createTestState()
    const result = handleMineStep(state)

    expect(result).toBe(state) // same reference, no copy needed
  })

  it('returns same state when mine is already exploded', () => {
    const state = createTestState()
    state.board[2][2].minePower = 1
    state.board[2][2].isExploded = true

    const result = handleMineStep(state)

    expect(result).toBe(state)
  })

  it('returns same state when game is not PLAYING', () => {
    const state = createTestState()
    state.board[2][2].minePower = 1
    state.gameStatus = GameStatus.WON

    const result = handleMineStep(state)

    expect(result).toBe(state)
  })

  it('explodes mine and reduces HP', () => {
    const state = createTestState()
    state.board[2][2].minePower = 2

    const result = handleMineStep(state)

    expect(result.hp).toBe(3) // 5 - 2
    expect(result.gameStatus).toBe(GameStatus.PLAYING)
    expect(result.board[2][2].isExploded).toBe(true)
  })

  it('sets game status to LOST when HP drops to 0', () => {
    const state = createTestState()
    state.hp = 2
    state.board[2][2].minePower = 2

    const result = handleMineStep(state)

    expect(result.hp).toBe(0)
    expect(result.gameStatus).toBe(GameStatus.LOST)
  })

  it('sets game status to LOST when HP drops below 0', () => {
    const state = createTestState()
    state.hp = 1
    state.board[2][2].minePower = 3

    const result = handleMineStep(state)

    expect(result.hp).toBe(-2)
    expect(result.gameStatus).toBe(GameStatus.LOST)
  })

  it('does not mutate the original game state', () => {
    const state = createTestState()
    state.board[2][2].minePower = 2
    const originalHp = state.hp
    const originalBoard = state.board

    const result = handleMineStep(state)

    expect(state.hp).toBe(originalHp)
    expect(state.board).toBe(originalBoard)
    expect(state.board[2][2].isExploded).toBe(false)
    expect(result.board).not.toBe(state.board)
    expect(result.board[2][2].isExploded).toBe(true)
  })

  it('handles chain reaction damage correctly', () => {
    const state = createTestState()
    state.board[2][2].minePower = 2 // boat steps on this, 3x3 blast
    state.board[2][3].minePower = 2 // in blast area, chains, 3x3 blast covers boat too

    const result = handleMineStep(state)

    // Boat at (2,2): damaged by mine at (2,2) power 2, AND mine at (2,3) power 2
    expect(result.hp).toBe(1) // 5 - 2 - 2
    expect(result.board[2][2].isExploded).toBe(true)
    expect(result.board[2][3].isExploded).toBe(true)
  })

  it('handles chain reaction where chained mine does not cover boat', () => {
    const state = createTestState()
    state.board[2][2].minePower = 2 // boat on this, 3x3 blast
    state.board[2][3].minePower = 1 // chains but power-1 blast only covers (2,3)

    const result = handleMineStep(state)

    // Boat at (2,2): damaged by mine at (2,2) power 2 only
    // Mine at (2,3) power-1 blast is only (2,3), boat at (2,2) not in it
    expect(result.hp).toBe(3) // 5 - 2
    expect(result.board[2][2].isExploded).toBe(true)
    expect(result.board[2][3].isExploded).toBe(true)
  })
})
