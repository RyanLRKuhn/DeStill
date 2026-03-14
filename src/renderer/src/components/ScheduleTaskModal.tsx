import React, { useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import { Column, RecurrenceRule, ScheduledTask } from '../types'
import { useApp } from '../context/AppContext'

interface Props {
  column: Column
  onClose: () => void
}

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

export function ScheduleTaskModal({ column, onClose }: Props) {
  const { dispatch } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ticket, setTicket] = useState('')
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
    if (!title.trim() || !timeOfDay) return
    const scheduled: ScheduledTask = {
      id: nanoid(),
      columnId: column.id,
      title: title.trim(),
      description: description.trim(),
      ticket: ticket.trim() || undefined,
      timeOfDay,
      recurrence: buildRecurrence(),
      createdAt: new Date().toISOString()
    }
    dispatch({ type: 'ADD_SCHEDULED_TASK', task: scheduled })
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  const recurrenceKinds: { value: RecurrenceKind; label: string }[] = [
    { value: 'once',         label: 'One-time' },
    { value: 'daily',        label: 'Daily' },
    { value: 'every_n_days', label: 'Every N days' },
    { value: 'weekly',       label: 'Weekly' },
    { value: 'monthly',      label: 'Monthly' },
  ]

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Schedule task <span>— {column.name}</span></h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sched-title">Title</label>
            <input
              id="sched-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label htmlFor="sched-ticket">Jira Ticket</label>
            <input
              id="sched-ticket"
              type="text"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="e.g. PROJ-123 (optional)"
              maxLength={32}
            />
          </div>
          <div className="form-group">
            <label htmlFor="sched-desc">Description</label>
            <textarea
              id="sched-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="sched-time">Time of day</label>
            <input
              id="sched-time"
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
              <label htmlFor="sched-date">Date</label>
              <input
                id="sched-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}
          {kind === 'every_n_days' && (
            <div className="form-group">
              <label htmlFor="sched-ndays">Repeat every</label>
              <div className="input-inline">
                <input
                  id="sched-ndays"
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
              <label htmlFor="sched-dow">Day of week</label>
              <select
                id="sched-dow"
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
              <label htmlFor="sched-dom">Day of month</label>
              <div className="input-inline">
                <input
                  id="sched-dom"
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!title.trim() || !timeOfDay}>
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
