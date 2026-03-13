import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Column } from '../types'

interface Props {
  column: Column
  onClose: () => void
}

export function AddTaskModal({ column, onClose }: Props) {
  const { dispatch } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ticket, setTicket] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({
      type: 'ADD_TASK',
      columnId: column.id,
      title: title.trim(),
      description: description.trim(),
      ...(ticket.trim() ? { ticket: ticket.trim() } : {})
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
          <h2>
            New task in <span>{column.name}</span>
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-ticket">Jira Ticket</label>
            <input
              id="task-ticket"
              type="text"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="e.g. PROJ-123 (optional)"
              maxLength={32}
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={4}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
