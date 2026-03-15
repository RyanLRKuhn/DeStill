import React, { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [jiraToken, setJiraToken] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.settings.get().then((s) => setJiraToken(s.jiraToken ?? ''))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await window.settings.set({ jiraToken: jiraToken.trim() || undefined })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
