import { describe, it, expect } from 'vitest'
import { adjacentMines, hasBoat, revealCell } from './cells'
import { createEmptyBoard } from './board'
import { FlagType, GameStatus } from '../types/game'
import type { GameState } from '../types/game'

describe('adjacentMines', () => {
  it('returns 0 when no neighboring mines exist', () => {
    const board = createEmptyBoard(3, 3)
    expect(adjacentMines(board, 1, 1)).toBe(0)
  })

  it('counts mines in all 8 directions', () => {
    const board = createEmptyBoard(3, 3)
    // Surround center with mines
    board[0][0].minePower = 1
    board[0][1].minePower = 2
    board[0][2].minePower = 3
    board[1][0].minePower = 1
    board[1][2].minePower = 1
    board[2][0].minePower = 2
    board[2][1].minePower = 1
    board[2][2].minePower = 3

    expect(adjacentMines(board, 1, 1)).toBe(8)
  })

  it('handles corner cells correctly', () => {
    const board = createEmptyBoard(3, 3)
    board[0][1].minePower = 1
    board[1][0].minePower = 1
    board[1][1].minePower = 2

    // Top-left corner has 3 neighbors, all are mines
    expect(adjacentMines(board, 0, 0)).toBe(3)
  })

  it('handles edge cells correctly', () => {
    const board = createEmptyBoard(3, 3)
    board[0][0].minePower = 1
    board[0][2].minePower = 1
    board[1][1].minePower = 1

    // Top-center edge has 5 neighbors, 3 are mines
    expect(adjacentMines(board, 0, 1)).toBe(3)
  })

  it('does not count the cell itself', () => {
    const board = createEmptyBoard(3, 3)
    board[1][1].minePower = 3 // Center is a mine

    // The center cell should not count itself
    expect(adjacentMines(board, 1, 1)).toBe(0)
  })
})

describe('hasBoat', () => {
  const makeGameState = (row: number, col: number): GameState => ({
    board: createEmptyBoard(3, 3),
    boatPosition: { row, col },
    hp: 5,
    initialHp: 5,
    mineCount: 0,
    initialMineCount: 0,
    gameStatus: GameStatus.PLAYING,
  })

  it('returns true when boat is at the given position', () => {
    const state = makeGameState(1, 2)
    expect(hasBoat(state, 1, 2)).toBe(true)
  })

  it('returns false when boat is elsewhere', () => {
    const state = makeGameState(1, 2)
    expect(hasBoat(state, 0, 0)).toBe(false)
    expect(hasBoat(state, 1, 1)).toBe(false)
  })
})

describe('revealCell', () => {
  it('reveals a single cell with adjacent mines', () => {
    const board = createEmptyBoard(3, 3)
    board[0][0].minePower = 1 // Mine at top-left

    // (0,1) has 1 adjacent mine, should reveal but not flood-fill
    const revealed = revealCell(board, 0, 1)
    expect(revealed.size).toBe(1)
    expect(board[0][1].isRevealed).toBe(true)
    expect(board[1][1].isRevealed).toBe(false)
  })

  it('flood-fills when cell has 0 adjacent mines', () => {
    // 4x4 board, mine at (0,0)
    const board = createEmptyBoard(4, 4)
    board[0][0].minePower = 1

    // Reveal (3,3) - far from the mine, has 0 adjacent mines
    const revealed = revealCell(board, 3, 3)

    // Should flood-fill a large area
    expect(revealed.size).toBeGreaterThan(1)
    expect(board[3][3].isRevealed).toBe(true)
    expect(board[2][2].isRevealed).toBe(true)
  })

  it('stops flood-fill at cells with adjacent mines', () => {
    // 3x3 board, mine at center
    const board = createEmptyBoard(5, 5)
    board[2][2].minePower = 1

    // Reveal (0,0) - 0 adjacent mines, should flood-fill
    const revealed = revealCell(board, 0, 0)

    // Cells adjacent to the mine (like 1,1) should be revealed but the
    // mine itself should not be auto-revealed
    expect(board[0][0].isRevealed).toBe(true)

    // Cells touching the mine have adjacentMines > 0, so they get revealed
    // but don't recurse further
    expect(board[1][1].isRevealed).toBe(true)
    expect(board[1][2].isRevealed).toBe(true)

    // The mine itself should NOT be revealed by flood-fill
    expect(board[2][2].isRevealed).toBe(false)

    // Check that all revealed cells are accounted for
    expect(revealed.size).toBeGreaterThan(1)
  })

  it('does not reveal flagged cells during flood-fill', () => {
    const board = createEmptyBoard(3, 3)
    // No mines, so flood-fill should reveal everything
    // But flag one cell first
    board[1][1].flagType = FlagType.FLAG

    const revealed = revealCell(board, 0, 0)

    // The flagged cell should not be revealed
    expect(board[1][1].isRevealed).toBe(false)
    // All other cells should be revealed (8 total minus 1 flagged)
    expect(revealed.size).toBe(8)
  })

  it('does not reveal question-marked cells during flood-fill', () => {
    const board = createEmptyBoard(3, 3)
    board[1][1].flagType = FlagType.QUESTION

    const revealed = revealCell(board, 0, 0)
    expect(board[1][1].isRevealed).toBe(false)
    expect(revealed.size).toBe(8)
  })

  it('returns empty set for already-revealed cells', () => {
    const board = createEmptyBoard(3, 3)
    board[1][1].isRevealed = true

    const revealed = revealCell(board, 1, 1)
    expect(revealed.size).toBe(0)
  })

  it('returns empty set for flagged cells', () => {
    const board = createEmptyBoard(3, 3)
    board[1][1].flagType = FlagType.FLAG

    const revealed = revealCell(board, 1, 1)
    expect(revealed.size).toBe(0)
  })

  it('reveals a mine cell without flood-filling', () => {
    const board = createEmptyBoard(3, 3)
    board[1][1].minePower = 2

    const revealed = revealCell(board, 1, 1)
    expect(revealed.size).toBe(1)
    expect(board[1][1].isRevealed).toBe(true)
    // Neighbors should NOT be revealed
    expect(board[0][0].isRevealed).toBe(false)
  })

  it('flood-fills in all 8 directions', () => {
    // 3x3 board, no mines - all cells should be revealed
    const board = createEmptyBoard(3, 3)

    const revealed = revealCell(board, 1, 1)
    expect(revealed.size).toBe(9)

    for (const row of board) {
      for (const cell of row) {
        expect(cell.isRevealed).toBe(true)
      }
    }
  })
})
