import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { TaskType } from '../types'

interface Props {
  onClose: () => void
}

export function PromptsModal({ onClose }: Props) {
  const { state, dispatch } = useApp()
  const [work, setWork] = useState(state.prompts.work)
  const [personal, setPersonal] = useState(state.prompts.personal)
  const [freelance, setFreelance] = useState(state.prompts.freelance)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const types: TaskType[] = ['work', 'personal', 'freelance']
    const values = { work, personal, freelance }
    types.forEach((t) => {
      if (values[t] !== state.prompts[t]) {
        dispatch({ type: 'SET_PROMPT', taskType: t, prompt: values[t] })
      }
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
          <h2>Task Prompts</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="prompt-work">Work tasks</label>
            <textarea
              id="prompt-work"
              value={work}
              onChange={(e) => setWork(e.target.value)}
              placeholder="Prompt applied to all work tasks..."
              rows={4}
            />
          </div>
          <div className="form-group">
            <label htmlFor="prompt-freelance">Freelance tasks</label>
            <textarea
              id="prompt-freelance"
              value={freelance}
              onChange={(e) => setFreelance(e.target.value)}
              placeholder="Prompt applied to all freelance tasks..."
              rows={4}
            />
          </div>
          <div className="form-group">
            <label htmlFor="prompt-personal">Personal tasks</label>
            <textarea
              id="prompt-personal"
              value={personal}
              onChange={(e) => setPersonal(e.target.value)}
              placeholder="Prompt applied to all personal tasks..."
              rows={4}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
