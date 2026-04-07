import { useState } from 'react'
import { DIFFICULTY_PRESETS } from '../../types/game'
import type { DifficultyPreset } from '../../types/game'
import styles from './SettingsModal.module.css'

interface SettingsModalProps {
  onStart: (rows: number, cols: number, mines: number, hp: number) => void
  onClose: () => void
}

export default function SettingsModal({ onStart, onClose }: SettingsModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>('beginner')
  const [rows, setRows] = useState(9)
  const [cols, setCols] = useState(9)
  const [mines, setMines] = useState(10)
  const [hp, setHp] = useState(5)

  const totalCells = rows * cols
  const minePercentage = totalCells > 0 ? (mines / totalCells) * 100 : 0
  const showWarning = minePercentage > 25

  function selectPreset(key: string) {
    const preset: DifficultyPreset = DIFFICULTY_PRESETS[key]
    setSelectedPreset(key)
    setRows(preset.rows)
    setCols(preset.cols)
    setMines(preset.mines)
    setHp(preset.hp)
  }

  function selectCustom() {
    setSelectedPreset(null)
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.floor(value)))
  }

  function handleStart() {
    const clampedRows = clamp(rows, 3, 30)
    const clampedCols = clamp(cols, 3, 50)
    const maxMines = clampedRows * clampedCols - 1
    const clampedMines = clamp(mines, 1, maxMines)
    const clampedHp = clamp(hp, 1, 20)
    onStart(clampedRows, clampedCols, clampedMines, clampedHp)
  }

  const isValid =
    rows >= 3 && rows <= 30 &&
    cols >= 3 && cols <= 50 &&
    mines >= 1 && mines < totalCells &&
    hp >= 1 && hp <= 20 &&
    Number.isFinite(rows) && Number.isFinite(cols) &&
    Number.isFinite(mines) && Number.isFinite(hp)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Game Settings</h2>

        <div className={styles.presets}>
          {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={selectedPreset === key ? styles.presetButtonActive : styles.presetButton}
              onClick={() => selectPreset(key)}
            >
              {preset.name} ({preset.rows}&times;{preset.cols}, {preset.mines} mines)
            </button>
          ))}
          <button
            className={selectedPreset === null ? styles.presetButtonActive : styles.presetButton}
            onClick={selectCustom}
          >
            Custom...
          </button>
        </div>

        {selectedPreset === null && (
          <div className={styles.customSection}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Rows</label>
              <input
                className={`${styles.input} ${rows < 3 || rows > 30 || !Number.isFinite(rows) ? styles.inputInvalid : ''}`}
                type="number"
                min={3}
                max={30}
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
              />
              <span className={styles.inputHint}>3-30</span>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Columns</label>
              <input
                className={`${styles.input} ${cols < 3 || cols > 50 || !Number.isFinite(cols) ? styles.inputInvalid : ''}`}
                type="number"
                min={3}
                max={50}
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
              />
              <span className={styles.inputHint}>3-50</span>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mines</label>
              <input
                className={`${styles.input} ${mines < 1 || mines >= totalCells || !Number.isFinite(mines) ? styles.inputInvalid : ''}`}
                type="number"
                min={1}
                max={totalCells - 1}
                value={mines}
                onChange={(e) => setMines(Number(e.target.value))}
              />
              <span className={styles.inputHint}>1-{totalCells > 0 ? totalCells - 1 : '?'}</span>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>HP</label>
              <input
                className={`${styles.input} ${hp < 1 || hp > 20 || !Number.isFinite(hp) ? styles.inputInvalid : ''}`}
                type="number"
                min={1}
                max={20}
                value={hp}
                onChange={(e) => setHp(Number(e.target.value))}
              />
              <span className={styles.inputHint}>1-20</span>
            </div>

            {!isValid && (
              <div className={styles.error}>
                Please fix the highlighted values before starting.
              </div>
            )}

            {showWarning && isValid && (
              <div className={styles.warning}>
                Warning: Mine density is {minePercentage.toFixed(1)}% (above 25% recommended max)
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.startButton}
            onClick={handleStart}
            disabled={selectedPreset === null && !isValid}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  )
}
