import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Task, WorkStatus } from '../types'

interface Props {
  task: Task
  onClose: () => void
}

export function EditTaskModal({ task, onClose }: Props) {
  const { dispatch } = useApp()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [ticket, setTicket] = useState(task.ticket ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [status, setStatus] = useState<WorkStatus>(task.status ?? 'idle')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({
      type: 'EDIT_TASK',
      id: task.id,
      title: title.trim(),
      description: description.trim(),
      ticket: ticket.trim() || undefined,
      status,
      dueDate: dueDate || undefined
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
          <h2>Edit task</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-task-title">Title</label>
            <input
              id="edit-task-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-task-ticket">Jira Ticket</label>
            <input
              id="edit-task-ticket"
              type="text"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="e.g. PROJ-123 (optional)"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <div className="status-toggle">
              {(['idle', 'in_progress', 'available', 'agent'] as WorkStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`status-option status-option-${s} ${status === s ? 'active' : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {s === 'idle' ? 'Idle' : s === 'in_progress' ? 'In Progress' : s === 'available' ? 'Available' : 'Agent'}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="edit-task-due">Due Date</label>
            <input
              id="edit-task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-task-desc">Description</label>
            <textarea
              id="edit-task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={4}
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn-danger"
              onClick={() => { dispatch({ type: 'DELETE_TASK', id: task.id }); onClose() }}
            >
              Delete
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
