export const FlagType = {
  NONE: 'NONE',
  FLAG: 'FLAG',
  QUESTION: 'QUESTION',
} as const

export type FlagType = (typeof FlagType)[keyof typeof FlagType]

export const GameStatus = {
  PLAYING: 'PLAYING',
  WON: 'WON',
  LOST: 'LOST',
} as const

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus]

export interface Cell {
  /** 0 = no mine, 1-3 = mine power */
  minePower: number
  isRevealed: boolean
  flagType: FlagType
  isExploded: boolean
}

export interface Position {
  row: number
  col: number
}

export interface GameState {
  board: Cell[][]
  boatPosition: Position
  hp: number
  initialHp: number
  mineCount: number
  initialMineCount: number
  gameStatus: GameStatus
}

export interface DifficultyPreset {
  name: string
  rows: number
  cols: number
  mines: number
  hp: number
}

export const DIFFICULTY_PRESETS: Record<string, DifficultyPreset> = {
  beginner: { name: 'Beginner', rows: 9, cols: 9, mines: 10, hp: 5 },
  intermediate: { name: 'Intermediate', rows: 16, cols: 16, mines: 40, hp: 5 },
  expert: { name: 'Expert', rows: 16, cols: 30, mines: 99, hp: 5 },
}
