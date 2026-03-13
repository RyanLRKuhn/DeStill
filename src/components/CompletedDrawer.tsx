import React from 'react'
import { useApp } from '../context/AppContext'
import { TaskCard } from './TaskCard'

export function CompletedDrawer() {
  const { state } = useApp()
  const completed = state.tasks.filter((t) => t.completed)

  if (completed.length === 0) {
    return (
      <div className="completed-drawer">
        <p className="completed-empty">No completed tasks yet.</p>
      </div>
    )
  }

  // Group by column
  const byColumn = state.columns.map((col) => ({
    column: col,
    tasks: completed.filter((t) => t.columnId === col.id)
  })).filter((g) => g.tasks.length > 0)

  // Tasks with deleted columns
  const orphaned = completed.filter(
    (t) => !state.columns.find((c) => c.id === t.columnId)
  )

  return (
    <div className="completed-drawer">
      <div className="completed-scroll">
        {byColumn.map(({ column, tasks }) => (
          <div key={column.id} className="completed-group">
            <h3 className="completed-group-name">{column.name}</h3>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ))}
        {orphaned.length > 0 && (
          <div className="completed-group">
            <h3 className="completed-group-name">Other</h3>
            {orphaned.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
