import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Repo } from '../types'

export function AddColumnInput() {
  const { dispatch } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [repoPath, setRepoPath] = useState('')
  const [repos, setRepos] = useState<Repo[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      window.settings.get().then((s) => setRepos(s.repos ?? []))
    }
  }, [editing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'ADD_COLUMN', name: name.trim(), repoPath: repoPath || undefined })
    setName('')
    setRepoPath('')
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
        {repos.length > 0 && (
          <select
            className="add-column-repo-select"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
          >
            <option value="">— No repo —</option>
            {repos.map((repo) => (
              <option key={repo.id} value={repo.path}>{repo.name}</option>
            ))}
          </select>
        )}
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
