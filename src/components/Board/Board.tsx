import type { GameState } from '../../types/game'
import { GameStatus } from '../../types/game'
import Cell from '../Cell/Cell'
import styles from './Board.module.css'

interface BoardProps {
  gameState: GameState
  onCellClick: (row: number, col: number) => void
  onCellRightClick: (row: number, col: number) => void
}

export default function Board({ gameState, onCellClick, onCellRightClick }: BoardProps) {
  const { board, boatPosition, gameStatus } = gameState
  const gameOver = gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST

  return (
    <div className={styles.board}>
      {board.map((row, r) => (
        <div key={r} className={styles.row}>
          {row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              cell={cell}
              row={r}
              col={c}
              board={board}
              isBoat={boatPosition.row === r && boatPosition.col === c}
              gameOver={gameOver}
              onClick={onCellClick}
              onRightClick={onCellRightClick}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
