import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PromptsModal } from './PromptsModal'

export function Toolbar() {
  const { state, dispatch } = useApp()
  const completedCount = state.tasks.filter((t) => t.completed).length
  const [showPrompts, setShowPrompts] = useState(false)

  return (
    <>
      <div className="toolbar">
        <span className="toolbar-title">Tasks</span>
        <button className="completed-toggle" onClick={() => setShowPrompts(true)}>
          Prompts
        </button>
        <button
          className={`completed-toggle ${state.showCompleted ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_COMPLETED' })}
        >
          {state.showCompleted ? 'Hide completed' : `Completed (${completedCount})`}
        </button>
      </div>
      {showPrompts && <PromptsModal onClose={() => setShowPrompts(false)} />}
    </>
  )
}
