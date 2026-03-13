import React, { useState } from 'react'
import { Column as ColumnType } from '../types'
import { useApp } from '../context/AppContext'
import { TaskCard } from './TaskCard'
import { AddTaskModal } from './AddTaskModal'

interface Props {
  column: ColumnType
}

export function Column({ column }: Props) {
  const { state, dispatch } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const tasks = state.tasks.filter((t) => t.columnId === column.id && !t.completed)

  function handleDelete() {
    if (confirmDelete) {
      dispatch({ type: 'DELETE_COLUMN', id: column.id })
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className="column">
      <div className="column-header">
        <h2 className="column-name">{column.name}</h2>
        <button
          className={`column-delete ${confirmDelete ? 'confirm' : ''}`}
          onClick={handleDelete}
          title={confirmDelete ? 'Click again to confirm delete' : 'Delete column'}
        >
          {confirmDelete ? '?' : '×'}
        </button>
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="empty-column">No tasks</div>
        )}
      </div>

      <button className="add-task-btn" onClick={() => setShowModal(true)}>
        + Add task
      </button>

      {showModal && <AddTaskModal column={column} onClose={() => setShowModal(false)} />}
    </div>
  )
}
