import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('Minesweeper Boat')).toBeInTheDocument()
  })

  it('renders desktop instructions containing WASD', () => {
    render(<App />)
    expect(screen.getByText(/WASD/)).toBeInTheDocument()
  })

  it('renders mobile instructions containing Swipe', () => {
    render(<App />)
    expect(screen.getByText(/Swipe/)).toBeInTheDocument()
  })

  it('renders the header with HP and mine count', () => {
    render(<App />)
    expect(screen.getByText('HP')).toBeInTheDocument()
    expect(screen.getByText('Mines')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
  })

  it('renders the New Game and Settings buttons', () => {
    render(<App />)
    expect(screen.getByText('New Game')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders the game board with cells', () => {
    render(<App />)
    const cells = screen.getAllByRole('button', { name: /Cell/ })
    expect(cells.length).toBeGreaterThan(0)
  })
})
