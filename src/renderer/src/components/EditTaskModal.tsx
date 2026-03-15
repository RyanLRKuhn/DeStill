import React from 'react'
import { useApp } from '../context/AppContext'
import { Task } from '../types'
import { CreateTaskForm, EditFormData } from './CreateTaskForm'

interface Props {
  task: Task
  onClose: () => void
}

export function EditTaskModal({ task, onClose }: Props) {
  const { dispatch } = useApp()

  const initialValues: EditFormData = {
    title: task.title,
    description: task.description,
    ticket: task.ticket,
    dueDate: task.dueDate,
    prUrl: task.prUrl,
    status: task.status ?? 'idle',
  }

  function handleSubmit(data: EditFormData) {
    dispatch({
      type: 'EDIT_TASK',
      id: task.id,
      title: data.title,
      description: data.description,
      ticket: data.ticket,
      status: data.status,
      dueDate: data.dueDate,
      prUrl: data.prUrl,
    })
    onClose()
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_TASK', id: task.id })
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>Edit task</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <CreateTaskForm
          variant="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
