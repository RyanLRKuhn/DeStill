import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'

export function AddColumnInput() {
  const { dispatch } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'ADD_COLUMN', name: name.trim() })
    setName('')
    setEditing(false)
  }

  function handleBlur() {
    if (!name.trim()) setEditing(false)
  }

  if (!editing) {
    return (
      <button className="add-column-btn" onClick={() => setEditing(true)}>
        + Add column
      </button>
    )
  }

  return (
    <div className="add-column-form-wrapper">
      <form onSubmit={handleSubmit} className="add-column-form">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          placeholder="Column name"
          maxLength={60}
          className="add-column-input"
        />
        <div className="add-column-actions">
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Add
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
