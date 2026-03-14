import React from 'react'
import { ScheduledTask } from '../types'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function describeRecurrence(s: ScheduledTask): string {
  const time = s.timeOfDay
  const r = s.recurrence
  switch (r.kind) {
    case 'once':         return `One-time on ${r.date} at ${time}`
    case 'daily':        return `Daily at ${time}`
    case 'every_n_days': return `Every ${r.n} days at ${time}`
    case 'weekly':       return `Weekly on ${DAY_NAMES[r.dayOfWeek]} at ${time}`
    case 'monthly':      return `Monthly on day ${r.dayOfMonth} at ${time}`
  }
}

export function ScheduledTasksModal({ onClose }: Props) {
  const { state, dispatch } = useApp()

  const byColumn = state.columns.map((col) => ({
    column: col,
    tasks: state.scheduledTasks.filter((s) => s.columnId === col.id)
  })).filter((g) => g.tasks.length > 0)

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Scheduled tasks</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {byColumn.length === 0 ? (
          <p className="empty-scheduled">No scheduled tasks.</p>
        ) : (
          <div className="scheduled-list">
            {byColumn.map(({ column, tasks }) => (
              <div key={column.id} className="scheduled-column-group">
                <div className="scheduled-column-name">{column.name}</div>
                {tasks.map((s) => (
                  <div key={s.id} className="scheduled-item">
                    <div className="scheduled-item-body">
                      <div className="scheduled-item-title">{s.title}</div>
                      <div className="scheduled-item-meta">{describeRecurrence(s)}</div>
                    </div>
                    <button
                      className="btn-danger"
                      onClick={() => dispatch({ type: 'DELETE_SCHEDULED_TASK', id: s.id })}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
