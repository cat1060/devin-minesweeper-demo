import { describe, it, expect } from 'vitest'
import { adjacentMines, hasBoat, revealCell, checkWinCondition } from './cells'
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

describe('checkWinCondition', () => {
  function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
      board: createEmptyBoard(3, 3),
      boatPosition: { row: 0, col: 0 },
      hp: 5,
      initialHp: 5,
      mineCount: 1,
      initialMineCount: 1,
      gameStatus: GameStatus.PLAYING,
      ...overrides,
    }
  }

  it('returns WON when all unrevealed cells are mines', () => {
    const board = createEmptyBoard(3, 3)
    board[2][2].minePower = 1
    // Reveal all non-mine cells
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r !== 2 || c !== 2) board[r][c].isRevealed = true
      }
    }
    const state = makeState({ board })
    const result = checkWinCondition(state)
    expect(result.gameStatus).toBe(GameStatus.WON)
  })

  it('does not win when unrevealed non-mine cells remain', () => {
    const board = createEmptyBoard(3, 3)
    board[2][2].minePower = 1
    // Reveal some but not all non-mine cells
    board[0][0].isRevealed = true
    board[0][1].isRevealed = true
    const state = makeState({ board })
    const result = checkWinCondition(state)
    expect(result.gameStatus).toBe(GameStatus.PLAYING)
  })

  it('treats exploded mines as accounted for', () => {
    const board = createEmptyBoard(3, 3)
    board[2][2].minePower = 1
    board[2][2].isExploded = true
    board[2][2].isRevealed = true
    // Reveal all other cells
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r !== 2 || c !== 2) board[r][c].isRevealed = true
      }
    }
    const state = makeState({ board })
    const result = checkWinCondition(state)
    expect(result.gameStatus).toBe(GameStatus.WON)
  })

  it('does not change state if already WON', () => {
    const state = makeState({ gameStatus: GameStatus.WON })
    const result = checkWinCondition(state)
    expect(result).toBe(state)
    expect(result.gameStatus).toBe(GameStatus.WON)
  })

  it('does not change state if already LOST', () => {
    const state = makeState({ gameStatus: GameStatus.LOST })
    const result = checkWinCondition(state)
    expect(result).toBe(state)
    expect(result.gameStatus).toBe(GameStatus.LOST)
  })

  it('wins with multiple mines when all non-mine cells revealed', () => {
    const board = createEmptyBoard(3, 3)
    board[0][0].minePower = 1
    board[1][1].minePower = 2
    board[2][2].minePower = 3
    // Reveal all non-mine cells
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (board[r][c].minePower === 0) board[r][c].isRevealed = true
      }
    }
    const state = makeState({ board, mineCount: 3 })
    const result = checkWinCondition(state)
    expect(result.gameStatus).toBe(GameStatus.WON)
  })

  it('does not win when a flagged non-mine cell exists', () => {
    const board = createEmptyBoard(3, 3)
    board[2][2].minePower = 1
    // Reveal most cells but flag a non-mine cell instead of revealing it
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r === 2 && c === 2) continue // mine, leave unrevealed
        if (r === 1 && c === 1) {
          board[r][c].flagType = FlagType.FLAG // flagged non-mine, not revealed
          continue
        }
        board[r][c].isRevealed = true
      }
    }
    const state = makeState({ board })
    const result = checkWinCondition(state)
    expect(result.gameStatus).toBe(GameStatus.PLAYING)
  })

  it('preserves all other state fields when setting WON', () => {
    const board = createEmptyBoard(2, 2)
    board[1][1].minePower = 1
    board[0][0].isRevealed = true
    board[0][1].isRevealed = true
    board[1][0].isRevealed = true
    const state = makeState({ board, hp: 3, mineCount: 1, boatPosition: { row: 0, col: 0 } })
    const result = checkWinCondition(state)
    expect(result.gameStatus).toBe(GameStatus.WON)
    expect(result.hp).toBe(3)
    expect(result.mineCount).toBe(1)
    expect(result.boatPosition).toEqual({ row: 0, col: 0 })
    expect(result.board).toBe(state.board)
  })
})
