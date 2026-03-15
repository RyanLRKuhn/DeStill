import React, { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { Repo } from '../types'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [jiraToken, setJiraToken] = useState('')
  const [repos, setRepos] = useState<Repo[]>([])
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoPath, setNewRepoPath] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.settings.get().then((s) => {
      setJiraToken(s.jiraToken ?? '')
      setRepos(s.repos ?? [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await window.settings.set({ jiraToken: jiraToken.trim() || undefined, repos })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleAddRepo() {
    if (!newRepoPath.trim()) return
    const repo: Repo = {
      id: nanoid(),
      name: newRepoName.trim() || newRepoPath.trim(),
      path: newRepoPath.trim()
    }
    setRepos((prev) => [...prev, repo])
    setNewRepoName('')
    setNewRepoPath('')
  }

  function handleRemoveRepo(id: string) {
    setRepos((prev) => prev.filter((r) => r.id !== id))
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="jira-token">Jira API Token</label>
            <input
              id="jira-token"
              type="password"
              value={jiraToken}
              onChange={(e) => setJiraToken(e.target.value)}
              placeholder="Paste your Atlassian API token"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Repositories</label>
            {repos.length > 0 && (
              <div className="repo-list">
                {repos.map((repo) => (
                  <div key={repo.id} className="repo-list-item">
                    <div className="repo-list-item-info">
                      <span className="repo-list-item-name">{repo.name}</span>
                      <span className="repo-list-item-path">{repo.path}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-danger repo-remove-btn"
                      onClick={() => handleRemoveRepo(repo.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="repo-add-form">
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="Name (optional)"
              />
              <input
                type="text"
                value={newRepoPath}
                onChange={(e) => setNewRepoPath(e.target.value)}
                placeholder="/absolute/path/to/repo"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRepo() } }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddRepo}
                disabled={!newRepoPath.trim()}
              >
                Add
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
