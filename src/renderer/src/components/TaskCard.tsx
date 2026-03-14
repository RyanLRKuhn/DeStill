import React, { useState } from 'react'
import { Task, getTaskType } from '../types'
import { getDegradationColor, getDegradationBg } from '../utils/degradation'
import { useApp } from '../context/AppContext'
import { EditTaskModal } from './EditTaskModal'

interface Props {
  task: Task
}

export function TaskCard({ task }: Props) {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState(false)
  const accentColor = task.completed ? 'hsl(0, 0%, 40%)' : getDegradationColor(task.createdAt)
  const bgColor = task.completed ? 'hsl(0, 0%, 12%)' : getDegradationBg(task.createdAt)

  const dueDateLabel = (() => {
    if (!task.dueDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = new Date(task.dueDate + 'T00:00:00')
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
    const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    if (diffDays < 0) return { label, cls: 'due-overdue' }
    if (diffDays <= 1) return { label, cls: 'due-soon' }
    return { label, cls: 'due-normal' }
  })()

  function handleComplete() {
    dispatch({ type: 'COMPLETE_TASK', id: task.id })
  }

  function handleUncomplete() {
    dispatch({ type: 'UNCOMPLETE_TASK', id: task.id })
  }

  function handleAgentSpawn() {
    if (task.status === 'available') {
      const column = state.columns.find((c) => c.id === task.columnId)
      const repoPath = column?.repoPath ?? ''
      const workPrompt = state.prompts.work ?? ''
      const taskDescription = workPrompt
        ? `${workPrompt}\n\n${task.title}\n${task.description}`
        : `${task.title}\n${task.description}`
      window.agent.spawn({ taskId: task.id, taskDescription, repoPath })
    } else {
      dispatch({ type: 'SET_TASK_STATUS', id: task.id, status: 'available' })
    }
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
              {!task.completed && getTaskType(task) === 'work' && (
                <button
                  className={`complete-btn${task.status === 'available' ? ' available-active' : ''}`}
                  onClick={handleAgentSpawn}
                  title={task.status === 'available' ? 'Spawn agent' : 'Make available for agent'}
                >
                  ⚡
                </button>
              )}
              {!task.completed && (
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
            {dueDateLabel && <span className={`task-due ${dueDateLabel.cls}`}>{dueDateLabel.label}</span>}
            <span className={`task-status task-status-${task.status ?? 'idle'}`}>
              {task.status === 'in_progress' ? 'In Progress' : task.status === 'agent' ? 'Agent' : task.status === 'available' ? 'Available' : 'Idle'}
            </span>
          </div>
          {task.description && <p className="task-description">{task.description}</p>}
        </div>
      </div>
      {editing && <EditTaskModal task={task} onClose={() => setEditing(false)} />}
    </>
  )
}
