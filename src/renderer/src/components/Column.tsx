import React, { useState, useRef } from 'react'
import { Column as ColumnType, getTaskType } from '../types'
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
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragIdRef = useRef<string | null>(null)

  const tasks = state.tasks.filter((t) => t.columnId === column.id && !t.completed)
  const blocked = tasks.length > 0 && getTaskType(tasks[0]) !== 'work'

  function handleDelete() {
    if (confirmDelete) {
      dispatch({ type: 'DELETE_COLUMN', id: column.id })
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className={`column ${blocked ? 'column-blocked' : ''}`}>
      <div className="column-header">
        <h2 className="column-name">{column.name}</h2>
        {blocked && <span className="column-blocked-badge">blocked</span>}
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
          <div
            key={task.id}
            draggable
            onDragStart={() => { dragIdRef.current = task.id }}
            onDragOver={(e) => { e.preventDefault(); setDragOverId(task.id) }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={() => {
              if (dragIdRef.current && dragIdRef.current !== task.id) {
                dispatch({ type: 'REORDER_TASK', id: dragIdRef.current, targetId: task.id })
              }
              setDragOverId(null)
              dragIdRef.current = null
            }}
            onDragEnd={() => { setDragOverId(null); dragIdRef.current = null }}
            className={dragOverId === task.id ? 'drag-over' : undefined}
          >
            <TaskCard task={task} />
          </div>
        ))}
        {tasks.length === 0 && <div className="empty-column">No tasks</div>}
      </div>

      <button className="add-task-btn" onClick={() => setShowModal(true)}>
        + Add task
      </button>

      {showModal && <AddTaskModal column={column} onClose={() => setShowModal(false)} />}
    </div>
  )
}
