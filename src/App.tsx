import { useState, useEffect, useCallback, useRef } from 'react'
import { GameStatus, DIFFICULTY_PRESETS } from './types/game'
import type { GameState } from './types/game'
import { initializeGame, moveBoat, teleportBoat, handleMineStep, flagCell } from './logic'
import Board from './components/Board/Board'
import Header from './components/Header/Header'
import SettingsModal from './components/SettingsModal/SettingsModal'
import './App.css'

const DEFAULT_PRESET = DIFFICULTY_PRESETS.beginner

function App() {
  const [gameState, setGameState] = useState<GameState>(() =>
    initializeGame(DEFAULT_PRESET.rows, DEFAULT_PRESET.cols, DEFAULT_PRESET.mines, DEFAULT_PRESET.hp),
  )
  const [timer, setTimer] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start/stop timer based on game status
  useEffect(() => {
    if (gameState.gameStatus === GameStatus.PLAYING) {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameState.gameStatus])

  const startNewGame = useCallback(
    (rows: number, cols: number, mines: number, hp: number) => {
      setGameState(initializeGame(rows, cols, mines, hp))
      setTimer(0)
      setShowSettings(false)
    },
    [],
  )

  const resetGame = useCallback(() => {
    const rows = gameState.board.length
    const cols = gameState.board[0].length
    startNewGame(rows, cols, gameState.mineCount, 5)
  }, [gameState.board, gameState.mineCount, startNewGame])

  // Keyboard handler for boat movement
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showSettings) return

      const key = e.key
      const movementKeys = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

      if (movementKeys.includes(key)) {
        e.preventDefault()
        setGameState((prev) => {
          const moved = moveBoat(prev, key)
          if (!moved) return prev
          return handleMineStep(moved)
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettings])

  // Left-click: teleport boat
  const handleCellClick = useCallback((row: number, col: number) => {
    setGameState((prev) => {
      const result = teleportBoat(prev, row, col)
      return result ?? prev
    })
  }, [])

  // Right-click: toggle flag
  const handleCellRightClick = useCallback((row: number, col: number) => {
    setGameState((prev) => {
      const result = flagCell(prev, row, col)
      return result ?? prev
    })
  }, [])

  return (
    <div className="app">
      <h1>Minesweeper Boat</h1>
      <Header
        gameState={gameState}
        timer={timer}
        onReset={resetGame}
        onOpenSettings={() => setShowSettings(true)}
      />
      <Board
        gameState={gameState}
        onCellClick={handleCellClick}
        onCellRightClick={handleCellRightClick}
      />
      <p className="instructions">
        WASD / Arrow keys to move | Click to teleport | Right-click to flag
      </p>
      {showSettings && (
        <SettingsModal
          onStart={startNewGame}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
