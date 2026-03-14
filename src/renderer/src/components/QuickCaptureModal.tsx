import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
}

export function QuickCaptureModal({ onClose }: Props) {
  const { state, dispatch } = useApp()
  const [columnId, setColumnId] = useState('')
  const [title, setTitle] = useState('')
  const [ticket, setTicket] = useState('')
  const columnRef = useRef<HTMLSelectElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    columnRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !columnId) return
    dispatch({
      type: 'ADD_TASK',
      columnId,
      title: title.trim(),
      description: '',
      ...(ticket.trim() ? { ticket: ticket.trim() } : {})
    })
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal modal-compact">
        <div className="modal-header">
          <h2>Quick capture</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="qc-column">Column</label>
            <select
              id="qc-column"
              ref={columnRef}
              value={columnId}
              onChange={(e) => { setColumnId(e.target.value); setTimeout(() => titleRef.current?.focus(), 0) }}
            >
              <option value="" disabled>Select column...</option>
              {state.columns.map((col) => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="qc-title">Title</label>
            <input
              id="qc-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label htmlFor="qc-ticket">Jira Ticket</label>
            <input
              id="qc-ticket"
              type="text"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="e.g. PROJ-123 (optional)"
              maxLength={32}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!title.trim() || !columnId}>
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
