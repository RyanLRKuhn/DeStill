import React, { useState } from 'react'
import { Column as ColumnType, getTaskType } from '../types'
import { useApp } from '../context/AppContext'
import { INBOX_COLUMN_ID } from '../context/AppContext'
import { TaskCard } from './TaskCard'
import { AddTaskModal } from './AddTaskModal'
import { ScheduleTaskModal } from './ScheduleTaskModal'
import { ColumnSettingsModal } from './ColumnSettingsModal'

interface Props {
  column: ColumnType
}

export function Column({ column }: Props) {
  const { state, dispatch } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [isDragOverColumn, setIsDragOverColumn] = useState(false)

  const isInbox = column.id === INBOX_COLUMN_ID
  const tasks = state.tasks.filter((t) => t.columnId === column.id && !t.completed)
  const waiting = tasks.length > 0 && getTaskType(tasks[0]) === 'personal'

  function handleDelete() {
    if (confirmDelete) {
      dispatch({ type: 'DELETE_COLUMN', id: column.id })
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  function getDraggedId(e: React.DragEvent): string | null {
    return e.dataTransfer.getData('taskId') || null
  }

  function handleTaskDrop(e: React.DragEvent, targetTaskId: string) {
    e.preventDefault()
    e.stopPropagation()
    const draggedId = getDraggedId(e)
    if (!draggedId || draggedId === targetTaskId) {
      setDragOverId(null)
      return
    }
    const draggedTask = state.tasks.find((t) => t.id === draggedId)
    if (!draggedTask) return
    if (draggedTask.columnId === column.id) {
      dispatch({ type: 'REORDER_TASK', id: draggedId, targetId: targetTaskId })
    } else {
      dispatch({ type: 'MOVE_TASK', id: draggedId, columnId: column.id })
    }
    setDragOverId(null)
  }

  function handleColumnDrop(e: React.DragEvent) {
    e.preventDefault()
    const draggedId = getDraggedId(e)
    if (!draggedId) {
      setIsDragOverColumn(false)
      return
    }
    const draggedTask = state.tasks.find((t) => t.id === draggedId)
    if (draggedTask && draggedTask.columnId !== column.id) {
      dispatch({ type: 'MOVE_TASK', id: draggedId, columnId: column.id })
    }
    setIsDragOverColumn(false)
  }

  return (
    <div className={`column ${waiting ? 'column-waiting' : ''}`}>
      <div className="column-header">
        <h2 className="column-name">{column.name}</h2>
        {waiting && <span className="column-waiting-badge">waiting</span>}
        {!isInbox && (
          <>
            <button
              className="column-delete"
              onClick={() => setShowSettings(true)}
              title="Column settings"
            >
              ⚙
            </button>
            <button
              className={`column-delete ${confirmDelete ? 'confirm' : ''}`}
              onClick={handleDelete}
              title={confirmDelete ? 'Click again to confirm delete' : 'Delete column'}
            >
              {confirmDelete ? '?' : '×'}
            </button>
          </>
        )}
      </div>

      <div
        className={`task-list ${isDragOverColumn ? 'column-drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOverColumn(true) }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOverColumn(false)
          }
        }}
        onDrop={handleColumnDrop}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('taskId', task.id) }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverId(task.id); setIsDragOverColumn(false) }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => handleTaskDrop(e, task.id)}
            onDragEnd={() => { setDragOverId(null); setIsDragOverColumn(false) }}
            className={dragOverId === task.id ? 'drag-over' : undefined}
          >
            <TaskCard task={task} />
          </div>
        ))}
        {tasks.length === 0 && <div className="empty-column">No tasks</div>}
      </div>

      <div className="column-footer">
        <button className="add-task-btn" onClick={() => setShowModal(true)}>+ Add task</button>
        <button className="schedule-task-btn" onClick={() => setShowScheduleModal(true)} title="Schedule task">⏱</button>
      </div>

      {showModal && <AddTaskModal column={column} onClose={() => setShowModal(false)} />}
      {showScheduleModal && <ScheduleTaskModal column={column} onClose={() => setShowScheduleModal(false)} />}
      {showSettings && <ColumnSettingsModal column={column} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
