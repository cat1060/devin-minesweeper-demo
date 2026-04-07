import type { GameState } from '../../types/game'
import { GameStatus, FlagType } from '../../types/game'
import styles from './Header.module.css'

interface HeaderProps {
  gameState: GameState
  timer: number
  onReset: () => void
  onOpenSettings: () => void
}

function countFlags(gameState: GameState): number {
  let count = 0
  for (const row of gameState.board) {
    for (const cell of row) {
      if (cell.flagType === FlagType.FLAG) count++
    }
  }
  return count
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function Header({ gameState, timer, onReset, onOpenSettings }: HeaderProps) {
  const flagCount = countFlags(gameState)
  const remainingMines = gameState.mineCount - flagCount
  const maxHp = 5

  return (
    <div className={styles.header}>
      <div className={styles.stat}>
        <span className={styles.label}>HP</span>
        <div className={styles.hpBar}>
          {Array.from({ length: maxHp }, (_, i) => (
            <span
              key={i}
              className={i < gameState.hp ? styles.hpHeart : styles.hpHeartEmpty}
            >
              {'\u2764\uFE0F'}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.stat}>
        <span className={styles.label}>Mines</span>
        <span>{remainingMines}</span>
      </div>

      <div className={styles.stat}>
        <span className={styles.label}>Time</span>
        <span>{formatTime(timer)}</span>
      </div>

      {gameState.gameStatus !== GameStatus.PLAYING && (
        <div
          className={`${styles.statusMessage} ${
            gameState.gameStatus === GameStatus.WON ? styles.won : styles.lost
          }`}
        >
          {gameState.gameStatus === GameStatus.WON ? 'You Win!' : 'Game Over!'}
        </div>
      )}

      <button className={styles.resetButton} onClick={onReset}>
        New Game
      </button>
      <button className={styles.settingsButton} onClick={onOpenSettings}>
        Settings
      </button>
    </div>
  )
}
