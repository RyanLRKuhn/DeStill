import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

interface AgentLog {
  taskId: string
  lines: string[]
  exited: boolean
  exitCode: number | null
}

function AgentInput({ taskId }: { taskId: string }) {
  const [text, setText] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    window.agent.sendInput({ taskId, text: text.trim() })
    setText('')
  }

  return (
    <form className="agent-input-form" onSubmit={handleSubmit}>
      <input
        className="agent-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Send input to agent..."
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="agent-input-send" disabled={!text.trim()}>↵</button>
    </form>
  )
}

export function AgentLogPanel() {
  const { state } = useApp()
  const [logs, setLogs] = useState<Record<string, AgentLog>>({})
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubLog = window.agent.onLog(({ taskId, chunk }) => {
      setLogs((prev) => {
        const entry = prev[taskId] ?? { taskId, lines: [], exited: false, exitCode: null }
        return { ...prev, [taskId]: { ...entry, lines: [...entry.lines, chunk] } }
      })
      setOpen(true)
    })
    const unsubExited = window.agent.onExited(({ taskId, code }) => {
      setLogs((prev) => {
        const entry = prev[taskId] ?? { taskId, lines: [], exited: false, exitCode: null }
        return { ...prev, [taskId]: { ...entry, exited: true, exitCode: code } }
      })
    })
    return () => { unsubLog(); unsubExited() }
  }, [])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, open])

  // Show panel as soon as any task has agent status, even before stdout arrives
  const agentTasks = state.tasks.filter((t) => t.status === 'agent')
  const allTaskIds = new Set([...agentTasks.map((t) => t.id), ...Object.keys(logs)])

  // Open panel automatically when new agent tasks appear
  useEffect(() => {
    if (agentTasks.length > 0) setOpen(true)
  }, [agentTasks.length])

  if (allTaskIds.size === 0) return null

  const activeCount = agentTasks.length

  function getTaskTitle(taskId: string): string {
    return state.tasks.find((t) => t.id === taskId)?.title ?? taskId.slice(0, 8)
  }

  return (
    <div className={`agent-log-panel ${open ? 'agent-log-open' : 'agent-log-collapsed'}`}>
      <div className="agent-log-header" onClick={() => setOpen((v) => !v)}>
        <span className="agent-log-title">
          Agents {activeCount > 0 && <span className="agent-log-badge">{activeCount} running</span>}
        </span>
        <button className="agent-log-toggle">{open ? '▼' : '▲'}</button>
      </div>
      {open && (
        <div className="agent-log-body">
          {Array.from(allTaskIds).map((taskId) => {
            const entry = logs[taskId]
            const exited = entry?.exited ?? false
            const exitCode = entry?.exitCode ?? null
            const lines = entry?.lines ?? []
            return (
              <div key={taskId} className="agent-log-task">
                <div className="agent-log-task-header">
                  <span className="agent-log-task-title">{getTaskTitle(taskId)}</span>
                  <span className={`agent-log-task-status ${exited ? 'exited' : 'running'}`}>
                    {exited ? `exited ${exitCode ?? '?'}` : lines.length === 0 ? 'starting…' : 'running'}
                  </span>
                </div>
                <pre className="agent-log-output">{lines.join('')}</pre>
                {!exited && <AgentInput taskId={taskId} />}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
