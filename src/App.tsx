import { useState, useEffect, useCallback, useRef } from 'react'
import { useSwipe } from './hooks/useSwipe'
import { usePinchZoom } from './hooks/usePinchZoom'
import { GameStatus, DIFFICULTY_PRESETS } from './types/game'
import type { GameState } from './types/game'
import { initializeGame, moveBoat, teleportBoat, handleMineStep, flagCell, checkWinCondition } from './logic'
import type { SwipeDirection, SwipeStartCell } from './hooks/useSwipe'
import Board from './components/Board/Board'
import Header from './components/Header/Header'
import SettingsModal from './components/SettingsModal/SettingsModal'
import './App.css'

const DEFAULT_PRESET = DIFFICULTY_PRESETS.beginner

const SWIPE_KEY_MAP: Record<SwipeDirection, string> = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
}

function App() {
  const [gameState, setGameState] = useState<GameState>(() =>
    initializeGame(DEFAULT_PRESET.rows, DEFAULT_PRESET.cols, DEFAULT_PRESET.mines, DEFAULT_PRESET.hp),
  )
  const [timer, setTimer] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetZoomRef = useRef(() => {})

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
      resetZoomRef.current()
    },
    [],
  )

  const resetGame = useCallback(() => {
    const rows = gameState.board.length
    const cols = gameState.board[0].length
    startNewGame(rows, cols, gameState.initialMineCount, gameState.initialHp)
  }, [gameState.board, gameState.initialMineCount, gameState.initialHp, startNewGame])

  // Keyboard handler for boat movement
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showSettings) return

      const key = e.key
      const movementKeys = ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

      if (movementKeys.includes(key)) {
        e.preventDefault()
        setGameState((prev) => {
          const moved = moveBoat(prev, key)
          if (!moved) return prev
          return checkWinCondition(handleMineStep(moved))
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
      if (!result) return prev
      return checkWinCondition(result)
    })
  }, [])

  // Right-click: toggle flag
  const handleCellRightClick = useCallback((row: number, col: number) => {
    setGameState((prev) => {
      const result = flagCell(prev, row, col)
      if (!result) return prev
      return checkWinCondition(result)
    })
  }, [])

  // Swipe handler: if the swipe started on a revealed cell that isn't the
  // boat's current position, teleport the boat there first, then move.
  const handleSwipe = useCallback((direction: SwipeDirection, cell?: SwipeStartCell) => {
    if (showSettings) return
    const key = SWIPE_KEY_MAP[direction]
    setGameState((prev) => {
      let state = prev
      // Teleport to the swipe-origin cell if it's a different revealed cell
      if (cell) {
        const teleported = teleportBoat(state, cell.row, cell.col)
        if (teleported) {
          state = checkWinCondition(teleported)
        }
      }
      const moved = moveBoat(state, key)
      if (!moved) return state
      return checkWinCondition(handleMineStep(moved))
    })
  }, [showSettings])

  // Attach gesture listeners to boardContainer (the scroll container)
  // so preventDefault intercepts touch events before scrolling starts.
  // useSwipe handles single-finger swipe → boat movement.
  // usePinchZoom handles two-finger pinch → board zoom + pan.
  const boardContainerRef = useRef<HTMLDivElement>(null)
  useSwipe(boardContainerRef, handleSwipe)
  const { scale, resetZoom } = usePinchZoom(boardContainerRef)

  useEffect(() => {
    resetZoomRef.current = resetZoom
  }, [resetZoom])

  return (
    <div className="app">
      <div className="stickyHeader">
        <h1>Minesweeper Boat</h1>
        <Header
          gameState={gameState}
          timer={timer}
          onReset={resetGame}
          onOpenSettings={() => setShowSettings(true)}
        />
        <p className="instructions desktop-instructions">
          WASD / Arrow keys to move | Click to teleport | Right-click to flag/?/clear
        </p>
        <p className="instructions mobile-instructions">
          Swipe to move | Two fingers to zoom or move map | Tap revealed cell to teleport | Tap unrevealed cell to flag/?/clear
        </p>
      </div>
      <div className="boardContainer" ref={boardContainerRef}>
        <div style={{ zoom: scale }}>
          <Board
            gameState={gameState}
            onCellClick={handleCellClick}
            onCellRightClick={handleCellRightClick}
          />
        </div>
      </div>
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
