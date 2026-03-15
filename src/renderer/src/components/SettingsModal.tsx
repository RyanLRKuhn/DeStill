import React, { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { Repo } from '../types'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [jiraToken, setJiraToken] = useState('')
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [repos, setRepos] = useState<Repo[]>([])
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoPath, setNewRepoPath] = useState('')
  const [saved, setSaved] = useState(false)

  const [availableProjects, setAvailableProjects] = useState<{ key: string; name: string }[]>([])
  const [jiraProjectKey, setJiraProjectKey] = useState('')
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [jiraStatusFilters, setJiraStatusFilters] = useState<string[]>([])
  const [jiraEnabled, setJiraEnabled] = useState(false)
  const [fetchingProjects, setFetchingProjects] = useState(false)
  const [fetchingStatuses, setFetchingStatuses] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    window.settings.get().then((s) => {
      const token = s.jiraToken ?? ''
      const email = s.jiraEmail ?? ''
      const baseUrl = s.jiraBaseUrl ?? ''
      setJiraToken(token)
      setJiraEmail(email)
      setJiraBaseUrl(baseUrl)
      setJiraStatusFilters(s.jiraStatusFilters ?? [])
      setJiraEnabled(s.jiraEnabled ?? false)
      setJiraProjectKey(s.jiraProjectKey ?? '')
      setRepos(s.repos ?? [])

      console.log('[settings] loaded Jira settings:', { token: !!token, email, baseUrl })
      if (token.trim() && email.trim() && baseUrl.trim()) {
        setFetchingProjects(true)
        window.jira.fetchProjects({ baseUrl: baseUrl.trim(), email: email.trim(), token: token.trim() }).then((result) => {
          setFetchingProjects(false)
          console.log('[jira] fetchProjects result:', result)
          if (result.error) {
            console.error('[jira] fetchProjects error:', result.error)
            setFetchError(result.error)
          } else {
            console.log('[jira] fetchProjects projects:', result.projects)
            const projects = result.projects ?? []
            setAvailableProjects(projects)
            const savedKey = s.jiraProjectKey ?? ''
            if (savedKey && projects.some((p) => p.key === savedKey)) {
              fetchStatusesForProject(baseUrl.trim(), email.trim(), token.trim(), savedKey)
            }
          }
        })
      }
    })
  }, [])

  function fetchStatusesForProject(baseUrl: string, email: string, token: string, projectKey: string) {
    setFetchingStatuses(true)
    setAvailableStatuses([])
    setFetchError(null)
    window.jira.fetchStatuses({ baseUrl, email, token, projectKey }).then((result) => {
      setFetchingStatuses(false)
      console.log('[jira] fetchStatuses result:', result)
      if (result.error) {
        console.error('[jira] fetchStatuses error:', result.error)
        setFetchError(result.error)
      } else {
        console.log('[jira] fetchStatuses statuses:', result.statuses)
        setAvailableStatuses(result.statuses ?? [])
      }
    })
  }

  function handleProjectChange(key: string) {
    setJiraProjectKey(key)
    setJiraStatusFilters([])
    setAvailableStatuses([])
    if (key) {
      fetchStatusesForProject(jiraBaseUrl.trim(), jiraEmail.trim(), jiraToken.trim(), key)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await window.settings.set({
      jiraToken: jiraToken.trim() || undefined,
      jiraEmail: jiraEmail.trim() || undefined,
      jiraBaseUrl: jiraBaseUrl.trim() || undefined,
      jiraStatusFilters,
      jiraEnabled,
      jiraProjectKey: jiraProjectKey || undefined,
      repos
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleStatus(name: string) {
    setJiraStatusFilters((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
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
            <label htmlFor="jira-email">Jira Email</label>
            <input
              id="jira-email"
              type="email"
              value={jiraEmail}
              onChange={(e) => setJiraEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="jira-base-url">Jira Base URL</label>
            <input
              id="jira-base-url"
              type="url"
              value={jiraBaseUrl}
              onChange={(e) => setJiraBaseUrl(e.target.value)}
              placeholder="https://your-company.atlassian.net"
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

          <div className="settings-section">
            <h3>Jira Automation</h3>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={jiraEnabled}
                onChange={(e) => setJiraEnabled(e.target.checked)}
              />
              Enable Jira automation
            </label>
            <p className="settings-section-description">
              Select which Jira statuses should automatically create tasks.
            </p>
            {fetchError && <p className="settings-error">{fetchError}</p>}
            <div className="form-group">
              <label htmlFor="jira-project">Project</label>
              {fetchingProjects ? (
                <p className="settings-hint">Fetching projects…</p>
              ) : (
                <select
                  id="jira-project"
                  value={jiraProjectKey}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  disabled={availableProjects.length === 0}
                >
                  <option value="">— select a project —</option>
                  {availableProjects.map((p) => (
                    <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                  ))}
                </select>
              )}
            </div>
            {fetchingStatuses && <p className="settings-hint">Fetching statuses…</p>}
            {!fetchingStatuses && jiraProjectKey && availableStatuses.length > 0 && (
              <div className="status-checklist">
                {availableStatuses.map((name) => (
                  <label key={name} className="status-checkbox">
                    <input
                      type="checkbox"
                      checked={jiraStatusFilters.includes(name)}
                      onChange={() => toggleStatus(name)}
                    />
                    {name}
                  </label>
                ))}
              </div>
            )}
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
