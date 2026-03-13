import React from 'react'
import { Task } from '../types'
import { getDegradationColor, getDegradationBg } from '../utils/degradation'
import { useApp } from '../context/AppContext'

interface Props {
  task: Task
}

export function TaskCard({ task }: Props) {
  const { dispatch } = useApp()
  const accentColor = task.completed ? 'hsl(0, 0%, 50%)' : getDegradationColor(task.createdAt)
  const bgColor = task.completed ? 'hsl(0, 0%, 13%)' : getDegradationBg(task.createdAt)

  function handleComplete() {
    dispatch({ type: 'COMPLETE_TASK', id: task.id })
  }

  return (
    <div
      className="task-card"
      style={{ '--accent': accentColor, '--card-bg': bgColor } as React.CSSProperties}
    >
      <div className="task-card-accent" />
      <div className="task-card-body">
        <div className="task-card-header">
          <span className="task-title">{task.title}</span>
          {!task.completed && (
            <button className="complete-btn" onClick={handleComplete} title="Mark complete">
              ✓
            </button>
          )}
        </div>
        {task.description && <p className="task-description">{task.description}</p>}
      </div>
    </div>
  )
}
