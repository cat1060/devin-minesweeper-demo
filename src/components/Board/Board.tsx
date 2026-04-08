import { useRef, useState, useEffect, useCallback } from 'react'
import type { GameState } from '../../types/game'
import { GameStatus } from '../../types/game'
import { useSwipe } from '../../hooks/useSwipe'
import type { SwipeDirection } from '../../hooks/useSwipe'
import Cell from '../Cell/Cell'
import styles from './Board.module.css'

interface BoardProps {
  gameState: GameState
  onCellClick: (row: number, col: number) => void
  onCellRightClick: (row: number, col: number) => void
  onSwipe: (direction: SwipeDirection) => void
}

export default function Board({ gameState, onCellClick, onCellRightClick, onSwipe }: BoardProps) {
  const { board, boatPosition, gameStatus } = gameState
  const gameOver = gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST
  const wrapperRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })
  useSwipe(wrapperRef, onSwipe)

  const rows = board.length
  const cols = board[0].length

  const updateScale = useCallback(() => {
    const boardEl = boardRef.current
    if (!boardEl) return

    const boardWidth = boardEl.scrollWidth
    const boardHeight = boardEl.scrollHeight
    setBoardSize({ width: boardWidth, height: boardHeight })
    // Leave some padding (20px each side) for the viewport
    const availableWidth = window.innerWidth - 40
    const availableHeight = window.innerHeight * 0.7
    const scaleX = availableWidth / boardWidth
    const scaleY = availableHeight / boardHeight
    const newScale = Math.min(1, scaleX, scaleY)
    setScale(newScale)
  }, [])

  useEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [updateScale])

  // Recalculate scale when board dimensions change
  useEffect(() => {
    updateScale()
  }, [rows, cols, updateScale])

  return (
    <div
      className={styles.boardWrapper}
      ref={wrapperRef}
      style={scale < 1 ? {
        width: `${boardSize.width * scale}px`,
        height: `${boardSize.height * scale}px`,
      } : undefined}
    >
      <div
        className={styles.board}
        ref={boardRef}
        style={scale < 1 ? {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        } : undefined}
      >
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
    </div>
  )
}
