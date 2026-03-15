import React from 'react'
import { useApp } from '../context/AppContext'
import { Column } from '../types'
import { CreateTaskForm, TaskFormData } from './CreateTaskForm'

interface Props {
  column: Column
  onClose: () => void
}

export function AddTaskModal({ column, onClose }: Props) {
  const { dispatch } = useApp()

  function handleSubmit(data: TaskFormData) {
    dispatch({
      type: 'ADD_TASK',
      columnId: column.id,
      title: data.title,
      description: data.description,
      ...(data.ticket ? { ticket: data.ticket } : {}),
      ...(data.dueDate ? { dueDate: data.dueDate } : {}),
      ...(data.prUrl ? { prUrl: data.prUrl } : {})
    })
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>New task in <span>{column.name}</span></h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <CreateTaskForm variant="task" onSubmit={handleSubmit} onCancel={onClose} />
      </div>
    </div>
  )
}
