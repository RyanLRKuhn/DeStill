/// <reference types="vite/client" />

import { AppData } from './types'

declare global {
  interface Window {
    store: {
      read: () => Promise<AppData>
      write: (data: AppData) => Promise<void>
      agentCompleteTask: (params: { taskId: string; branchName: string; prUrl: string }) => Promise<{ success: boolean; reviewTaskId?: string; error?: string }>
      onChanged: (callback: () => void) => () => void
      onQuickCapture: (callback: () => void) => () => void
    }
    settings: {
      get: () => Promise<{ jiraToken?: string }>
      set: (settings: { jiraToken?: string }) => Promise<void>
    }
    agent: {
      spawn: (params: {
        taskId: string
        taskDescription: string
        repoPath: string
      }) => Promise<{ success: boolean; agentId?: string; error?: string }>
      sendInput: (params: { taskId: string; text: string }) => Promise<{ success: boolean; error?: string }>
      onLog: (callback: (payload: { taskId: string; chunk: string }) => void) => () => void
      onExited: (callback: (payload: { taskId: string; code: number | null }) => void) => () => void
    }
  }
}
