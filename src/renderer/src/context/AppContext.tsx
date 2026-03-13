import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { AppData, Column, Task, TaskType, WorkStatus } from '../types'

interface State extends AppData {
  showCompleted: boolean
  loaded: boolean
}

type Action =
  | { type: 'LOAD'; data: AppData }
  | { type: 'ADD_COLUMN'; name: string }
  | { type: 'DELETE_COLUMN'; id: string }
  | { type: 'ADD_TASK'; columnId: string; title: string; description: string; ticket?: string; status?: WorkStatus }
  | { type: 'EDIT_TASK'; id: string; title: string; description: string; ticket?: string; status?: WorkStatus }
  | { type: 'SET_TASK_STATUS'; id: string; status: WorkStatus }
  | { type: 'COMPLETE_TASK'; id: string }
  | { type: 'UNCOMPLETE_TASK'; id: string }
  | { type: 'REORDER_TASK'; id: string; targetId: string }
  | { type: 'SET_PROMPT'; taskType: TaskType; prompt: string }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'TOGGLE_COMPLETED' }

const defaultPrompts: Record<TaskType, string> = { work: '', personal: '', agent_generated: '' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        ...action.data,
        prompts: { ...defaultPrompts, ...action.data.prompts },
        loaded: true
      }

    case 'ADD_COLUMN': {
      const column: Column = { id: nanoid(), name: action.name }
      return { ...state, columns: [...state.columns, column] }
    }

    case 'DELETE_COLUMN':
      return {
        ...state,
        columns: state.columns.filter((c) => c.id !== action.id),
        tasks: state.tasks.filter((t) => t.columnId !== action.id)
      }

    case 'ADD_TASK': {
      const task: Task = {
        id: nanoid(),
        title: action.title,
        description: action.description,
        columnId: action.columnId,
        createdAt: new Date().toISOString(),
        completed: false,
        ...(action.ticket ? { ticket: action.ticket } : {}),
        status: action.status ?? 'idle'
      }
      return { ...state, tasks: [...state.tasks, task] }
    }

    case 'EDIT_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? { ...t, title: action.title, description: action.description, ticket: action.ticket, status: action.status ?? t.status ?? 'idle' }
            : t
        )
      }

    case 'SET_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, status: action.status } : t
        )
      }

    case 'COMPLETE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        )
      }

    case 'UNCOMPLETE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, completed: false, completedAt: undefined } : t
        )
      }

    case 'REORDER_TASK': {
      const dragged = state.tasks.find((t) => t.id === action.id)
      if (!dragged) return state
      const without = state.tasks.filter((t) => t.id !== action.id)
      const targetIndex = without.findIndex((t) => t.id === action.targetId)
      without.splice(targetIndex, 0, dragged)
      return { ...state, tasks: without }
    }

    case 'SET_PROMPT':
      return {
        ...state,
        prompts: { ...state.prompts, [action.taskType]: action.prompt }
      }

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) }

    case 'TOGGLE_COMPLETED':
      return { ...state, showCompleted: !state.showCompleted }

    default:
      return state
  }
}

const initialState: State = {
  columns: [],
  tasks: [],
  prompts: defaultPrompts,
  showCompleted: false,
  loaded: false
}

interface ContextValue {
  state: State
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<ContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    window.store.read().then((data) => {
      dispatch({ type: 'LOAD', data })
    })
  }, [])

  useEffect(() => {
    return window.store.onChanged(() => {
      window.store.read().then((data) => {
        dispatch({ type: 'LOAD', data })
      })
    })
  }, [])

  const save = useCallback((nextState: State) => {
    if (!nextState.loaded) return
    window.store.write({ columns: nextState.columns, tasks: nextState.tasks, prompts: nextState.prompts })
  }, [])

  useEffect(() => {
    save(state)
  }, [state.columns, state.tasks, state.prompts, save])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
