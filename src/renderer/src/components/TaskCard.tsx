import React, { useState } from 'react'
import { Task } from '../types'
import { getDegradationColor, getDegradationBg } from '../utils/degradation'
import { useApp } from '../context/AppContext'
import { EditTaskModal } from './EditTaskModal'

interface Props {
  task: Task
}

export function TaskCard({ task }: Props) {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState(false)
  const accentColor = task.completed ? 'hsl(0, 0%, 40%)' : getDegradationColor(task.createdAt, task.dueDate)
  const bgColor = task.completed ? 'hsl(0, 0%, 12%)' : getDegradationBg(task.createdAt, task.dueDate)

  const dueDateLabel = (() => {
    if (!task.dueDate) return null
    // Support legacy date-only values and new datetime-local values
    const due = new Date(task.dueDate.includes('T') ? task.dueDate : task.dueDate + 'T00:00:00')
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    const label = due.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    if (diffMs < 0) return { label, cls: 'due-overdue' }
    if (diffMs < 24 * 60 * 60 * 1000) return { label, cls: 'due-soon' }
    return { label, cls: 'due-normal' }
  })()

  function handleComplete() {
    dispatch({ type: 'COMPLETE_TASK', id: task.id })
  }

  function handleUncomplete() {
    dispatch({ type: 'UNCOMPLETE_TASK', id: task.id })
  }

  const column = state.columns.find((c) => c.id === task.columnId)

  function handleAgentSpawn() {
    const repoPath = column?.repoPath ?? ''
    const workPrompt = state.prompts.work ?? ''
    const ticketLine = task.ticket ? `Jira ticket: ${task.ticket}\n` : ''
    const taskDescription = workPrompt
      ? `${workPrompt}\n\n${ticketLine}${task.title}\n${task.description}`
      : `${ticketLine}${task.title}\n${task.description}`
    window.agent.spawn({ taskId: task.id, taskDescription, repoPath })
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
              {!task.completed && column?.repoPath && task.status !== 'agent' && (
                <button
                  className="complete-btn"
                  onClick={handleAgentSpawn}
                  title="Spawn agent"
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
            {task.prUrl && (
              <button
                className="task-pr-link"
                onClick={() => window.open(task.prUrl, '_blank')}
                title="Open pull request"
              >
                Open PR ↗
              </button>
            )}
            {task.agentGenerated && !task.prUrl && <span className="task-type-badge">agent</span>}
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
