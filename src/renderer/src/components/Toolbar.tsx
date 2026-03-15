import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PromptsModal } from './PromptsModal'
import { ScheduledTasksModal } from './ScheduledTasksModal'
import { SettingsModal } from './SettingsModal'

export function Toolbar() {
  const { state, dispatch } = useApp()
  const completedCount = state.tasks.filter((t) => t.completed).length
  const [showPrompts, setShowPrompts] = useState(false)
  const [showScheduled, setShowScheduled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <div className="toolbar">
        <span className="toolbar-title">Tasks</span>
        <button className="completed-toggle" onClick={() => setShowPrompts(true)}>
          Prompts
        </button>
        <button className="completed-toggle" onClick={() => setShowScheduled(true)}>
          Scheduled ({state.scheduledTasks.length})
        </button>
        <button className="completed-toggle" onClick={() => setShowSettings(true)}>
          Settings
        </button>
        <button
          className={`completed-toggle ${state.showCompleted ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_COMPLETED' })}
        >
          {state.showCompleted ? 'Hide completed' : `Completed (${completedCount})`}
        </button>
      </div>
      {showPrompts && <PromptsModal onClose={() => setShowPrompts(false)} />}
      {showScheduled && <ScheduledTasksModal onClose={() => setShowScheduled(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
