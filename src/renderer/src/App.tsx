import React, { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { Toolbar } from './components/Toolbar'
import { Column } from './components/Column'
import { AddColumnInput } from './components/AddColumnInput'
import { CompletedDrawer } from './components/CompletedDrawer'
import { QuickCaptureModal } from './components/QuickCaptureModal'
import './styles.css'

function Board() {
  const { state } = useApp()
  const [showQuickCapture, setShowQuickCapture] = useState(false)

  useEffect(() => {
    return window.store.onQuickCapture(() => setShowQuickCapture(true))
  }, [])

  if (!state.loaded) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        {state.showCompleted ? (
          <CompletedDrawer />
        ) : (
          <div className="board">
            {state.columns.map((col) => (
              <Column key={col.id} column={col} />
            ))}
            <AddColumnInput />
          </div>
        )}
      </div>
      {showQuickCapture && <QuickCaptureModal onClose={() => setShowQuickCapture(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Board />
    </AppProvider>
  )
}
