import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Column } from '../types'

interface Props {
  column: Column
  onClose: () => void
}

export function ColumnSettingsModal({ column, onClose }: Props) {
  const { dispatch } = useApp()
  const [repoPath, setRepoPath] = useState(column.repoPath ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    dispatch({ type: 'EDIT_COLUMN', id: column.id, repoPath: repoPath.trim() })
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>Column settings — <span>{column.name}</span></h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="col-repo-path">Repository path</label>
            <input
              id="col-repo-path"
              ref={inputRef}
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/absolute/path/to/repo"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
