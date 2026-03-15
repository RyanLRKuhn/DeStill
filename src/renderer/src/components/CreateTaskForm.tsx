import React, { useState, useRef, useEffect } from 'react'
import { RecurrenceRule, WorkStatus } from '../types'

type RecurrenceKind = 'once' | 'daily' | 'every_n_days' | 'weekly' | 'monthly'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function defaultTime(): string {
  const now = new Date()
  now.setHours(now.getHours() + 1, 0, 0, 0)
  return `${String(now.getHours()).padStart(2, '0')}:00`
}

function defaultDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDueDate(d: string): string {
  if (!d) return ''
  return d.includes('T') ? d.slice(0, 16) : d + 'T00:00'
}

export interface TaskFormData {
  title: string
  description: string
  ticket?: string
  dueDate?: string
  prUrl?: string
}

export interface ScheduleFormData extends TaskFormData {
  timeOfDay: string
  recurrence: RecurrenceRule
}

export interface EditFormData extends TaskFormData {
  status: WorkStatus
}

type Props =
  | { variant: 'task'; onSubmit: (data: TaskFormData) => void; onCancel: () => void }
  | { variant: 'schedule'; onSubmit: (data: ScheduleFormData) => void; onCancel: () => void }
  | { variant: 'edit'; initialValues: EditFormData; onSubmit: (data: EditFormData) => void; onDelete: () => void; onCancel: () => void }

const recurrenceKinds: { value: RecurrenceKind; label: string }[] = [
  { value: 'once',         label: 'One-time' },
  { value: 'daily',        label: 'Daily' },
  { value: 'every_n_days', label: 'Every N days' },
  { value: 'weekly',       label: 'Weekly' },
  { value: 'monthly',      label: 'Monthly' },
]

export function CreateTaskForm(props: Props) {
  const initValues = props.variant === 'edit' ? props.initialValues : undefined

  const [title, setTitle] = useState(initValues?.title ?? '')
  const [description, setDescription] = useState(initValues?.description ?? '')
  const [ticket, setTicket] = useState(initValues?.ticket ?? '')
  const [dueDate, setDueDate] = useState(normalizeDueDate(initValues?.dueDate ?? ''))
  const [prUrl, setPrUrl] = useState(initValues?.prUrl ?? '')
  const [status, setStatus] = useState<WorkStatus>(initValues?.status ?? 'idle')
  const [timeOfDay, setTimeOfDay] = useState(defaultTime)
  const [kind, setKind] = useState<RecurrenceKind>('once')
  const [date, setDate] = useState(defaultDate)
  const [nDays, setNDays] = useState(2)
  const [dayOfWeek, setDayOfWeek] = useState(new Date().getDay())
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate())
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  function buildRecurrence(): RecurrenceRule {
    switch (kind) {
      case 'once':         return { kind: 'once', date }
      case 'daily':        return { kind: 'daily' }
      case 'every_n_days': return { kind: 'every_n_days', n: nDays }
      case 'weekly':       return { kind: 'weekly', dayOfWeek }
      case 'monthly':      return { kind: 'monthly', dayOfMonth }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const base: TaskFormData = {
      title: title.trim(),
      description: description.trim(),
      ticket: ticket.trim() || undefined,
      dueDate: dueDate || undefined,
      prUrl: prUrl.trim() || undefined,
    }
    if (!base.title) return
    if (props.variant === 'edit') {
      props.onSubmit({ ...base, status })
    } else if (props.variant === 'schedule') {
      if (!timeOfDay) return
      props.onSubmit({ ...base, timeOfDay, recurrence: buildRecurrence() })
    } else {
      props.onSubmit(base)
    }
  }

  const isValid = !!title.trim() && (props.variant !== 'schedule' || !!timeOfDay)

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="task-title">Title</label>
        <input
          id="task-title"
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          maxLength={120}
        />
      </div>
      <div className="form-group">
        <label htmlFor="task-ticket">Jira Ticket</label>
        <input
          id="task-ticket"
          type="text"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          placeholder="e.g. PROJ-123 (optional)"
          maxLength={32}
        />
      </div>
      <div className="form-group">
        <label htmlFor="task-pr">PR URL</label>
        <input
          id="task-pr"
          type="url"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="https://github.com/... (optional)"
        />
      </div>
      <div className="form-group">
        <label htmlFor="task-due">Due Date</label>
        <input
          id="task-due"
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="task-desc">Description</label>
        <textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details..."
          rows={props.variant === 'schedule' ? 3 : 4}
        />
      </div>

      {props.variant === 'edit' && (
        <div className="form-group">
          <label>Status</label>
          <div className="status-toggle">
            {(['idle', 'in_progress', 'available', 'agent'] as WorkStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`status-option status-option-${s} ${status === s ? 'active' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s === 'idle' ? 'Idle' : s === 'in_progress' ? 'In Progress' : s === 'available' ? 'Available' : 'Agent'}
              </button>
            ))}
          </div>
        </div>
      )}

      {props.variant === 'schedule' && (
        <>
          <div className="form-group">
            <label htmlFor="task-time">Time of day</label>
            <input
              id="task-time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Recurrence</label>
            <div className="recurrence-toggle">
              {recurrenceKinds.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`recurrence-option${kind === r.value ? ' active' : ''}`}
                  onClick={() => setKind(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {kind === 'once' && (
            <div className="form-group">
              <label htmlFor="task-sched-date">Date</label>
              <input
                id="task-sched-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}
          {kind === 'every_n_days' && (
            <div className="form-group">
              <label htmlFor="task-sched-ndays">Repeat every</label>
              <div className="input-inline">
                <input
                  id="task-sched-ndays"
                  type="number"
                  min={2}
                  max={365}
                  value={nDays}
                  onChange={(e) => setNDays(Math.max(2, parseInt(e.target.value) || 2))}
                />
                <span className="input-suffix">days</span>
              </div>
            </div>
          )}
          {kind === 'weekly' && (
            <div className="form-group">
              <label htmlFor="task-sched-dow">Day of week</label>
              <select
                id="task-sched-dow"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
          )}
          {kind === 'monthly' && (
            <div className="form-group">
              <label htmlFor="task-sched-dom">Day of month</label>
              <div className="input-inline">
                <input
                  id="task-sched-dom"
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="modal-actions">
        {props.variant === 'edit' && (
          <button type="button" className="btn-danger" onClick={props.onDelete}>Delete</button>
        )}
        <button type="button" className="btn-secondary" onClick={props.onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!isValid}>
          {props.variant === 'edit' ? 'Save' : props.variant === 'schedule' ? 'Schedule' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}
