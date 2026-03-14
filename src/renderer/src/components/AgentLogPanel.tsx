import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

interface AgentLog {
  taskId: string
  lines: string[]
  exited: boolean
  exitCode: number | null
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

  const entries = Object.values(logs)
  if (entries.length === 0) return null

  const activeCount = entries.filter((e) => !e.exited).length

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
          {entries.map((entry) => (
            <div key={entry.taskId} className="agent-log-task">
              <div className="agent-log-task-header">
                <span className="agent-log-task-title">{getTaskTitle(entry.taskId)}</span>
                <span className={`agent-log-task-status ${entry.exited ? 'exited' : 'running'}`}>
                  {entry.exited ? `exited ${entry.exitCode ?? '?'}` : 'running'}
                </span>
              </div>
              <pre className="agent-log-output">{entry.lines.join('')}</pre>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
