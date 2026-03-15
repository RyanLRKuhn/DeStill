import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Column, Repo } from '../types'

interface Props {
  column: Column
  onClose: () => void
}

export function ColumnSettingsModal({ column, onClose }: Props) {
  const { dispatch } = useApp()
  const [repoPath, setRepoPath] = useState(column.repoPath ?? '')
  const [repos, setRepos] = useState<Repo[]>([])

  useEffect(() => {
    window.settings.get().then((s) => setRepos(s.repos ?? []))
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
            <label htmlFor="col-repo-path">Repository</label>
            {repos.length > 0 ? (
              <select
                id="col-repo-path"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
              >
                <option value="">— None —</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.path}>{repo.name}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  id="col-repo-path"
                  type="text"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder="/absolute/path/to/repo"
                />
                <p className="form-hint">Add repositories in Settings to select from a list.</p>
              </>
            )}
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
