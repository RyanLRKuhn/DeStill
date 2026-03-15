import React from 'react'
import { nanoid } from 'nanoid'
import { Column, ScheduledTask } from '../types'
import { useApp } from '../context/AppContext'
import { CreateTaskForm, ScheduleFormData } from './CreateTaskForm'

interface Props {
  column: Column
  onClose: () => void
}

export function ScheduleTaskModal({ column, onClose }: Props) {
  const { dispatch } = useApp()

  function handleSubmit(data: ScheduleFormData) {
    const scheduled: ScheduledTask = {
      id: nanoid(),
      columnId: column.id,
      title: data.title,
      description: data.description,
      ticket: data.ticket,
      dueDate: data.dueDate,
      prUrl: data.prUrl,
      timeOfDay: data.timeOfDay,
      recurrence: data.recurrence,
      createdAt: new Date().toISOString()
    }
    dispatch({ type: 'ADD_SCHEDULED_TASK', task: scheduled })
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Schedule task <span>— {column.name}</span></h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <CreateTaskForm variant="schedule" onSubmit={handleSubmit} onCancel={onClose} />
      </div>
    </div>
  )
}
