import React from 'react'
import { useApp } from '../context/AppContext'

export function Toolbar() {
  const { state, dispatch } = useApp()
  const completedCount = state.tasks.filter((t) => t.completed).length

  return (
    <div className="toolbar">
      <span className="toolbar-title">Tasks</span>
      <button
        className={`completed-toggle ${state.showCompleted ? 'active' : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_COMPLETED' })}
      >
        {state.showCompleted ? 'Hide completed' : `Completed (${completedCount})`}
      </button>
    </div>
  )
}
