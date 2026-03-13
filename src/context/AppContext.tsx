import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { AppData, Column, Task } from '../types'

interface State extends AppData {
  showCompleted: boolean
  loaded: boolean
}

type Action =
  | { type: 'LOAD'; data: AppData }
  | { type: 'ADD_COLUMN'; name: string }
  | { type: 'DELETE_COLUMN'; id: string }
  | { type: 'ADD_TASK'; columnId: string; title: string; description: string }
  | { type: 'COMPLETE_TASK'; id: string }
  | { type: 'TOGGLE_COMPLETED' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.data, loaded: true }

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
        completed: false
      }
      return { ...state, tasks: [...state.tasks, task] }
    }

    case 'COMPLETE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        )
      }

    case 'TOGGLE_COMPLETED':
      return { ...state, showCompleted: !state.showCompleted }

    default:
      return state
  }
}

const initialState: State = {
  columns: [],
  tasks: [],
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

  const save = useCallback(
    (nextState: State) => {
      if (!nextState.loaded) return
      window.store.write({ columns: nextState.columns, tasks: nextState.tasks })
    },
    []
  )

  useEffect(() => {
    save(state)
  }, [state.columns, state.tasks, save])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
