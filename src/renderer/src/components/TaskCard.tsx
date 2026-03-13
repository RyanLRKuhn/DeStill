import React, { useState } from 'react'
import { Task } from '../types'
import { getDegradationColor, getDegradationBg } from '../utils/degradation'
import { useApp } from '../context/AppContext'
import { EditTaskModal } from './EditTaskModal'

interface Props {
  task: Task
}

export function TaskCard({ task }: Props) {
  const { dispatch } = useApp()
  const [editing, setEditing] = useState(false)
  const accentColor = task.completed ? 'hsl(0, 0%, 40%)' : getDegradationColor(task.createdAt)
  const bgColor = task.completed ? 'hsl(0, 0%, 12%)' : getDegradationBg(task.createdAt)

  function handleComplete() {
    dispatch({ type: 'COMPLETE_TASK', id: task.id })
  }

  function handleUncomplete() {
    dispatch({ type: 'UNCOMPLETE_TASK', id: task.id })
  }

  return (
    <>
      <div
        className="task-card"
        style={{ '--accent': accentColor, '--card-bg': bgColor } as React.CSSProperties}
      >
        <div className="task-card-accent" />
        <div className="task-card-body">
          <div className="task-card-header">
            <span className="task-title">{task.title}</span>
            <div className="task-card-actions">
              <button className="complete-btn" onClick={() => setEditing(true)} title="Edit task">
                ✎
              </button>
              {!task.completed && task.ticket && (
                <button
                  className={`complete-btn${task.status === 'in_progress' ? ' pickup-active' : ''}`}
                  onClick={() => dispatch({ type: 'SET_TASK_STATUS', id: task.id, status: task.status === 'in_progress' ? 'idle' : 'in_progress' })}
                  title={task.status === 'in_progress' ? 'Put down' : 'Pick up'}
                >
                  ▶
                </button>
              )}
              {!task.completed && (
                <button className="complete-btn" onClick={handleComplete} title="Mark complete">
                  ✓
                </button>
              )}
              {task.completed && (
                <button className="complete-btn" onClick={handleUncomplete} title="Mark incomplete">
                  ↩
                </button>
              )}
            </div>
          </div>
          <div className="task-meta">
            {task.agentGenerated && <span className="task-type-badge">agent</span>}
            {task.ticket && <span className="task-ticket">{task.ticket}</span>}
            <span className={`task-status task-status-${task.status ?? 'idle'}`}>
              {task.status === 'in_progress' ? 'In Progress' : task.status === 'agent' ? 'Agent' : 'Idle'}
            </span>
          </div>
          {task.description && <p className="task-description">{task.description}</p>}
        </div>
      </div>
      {editing && <EditTaskModal task={task} onClose={() => setEditing(false)} />}
    </>
  )
}
