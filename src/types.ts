export interface Column {
  id: string
  name: string
}

export type TaskType = 'work' | 'personal'

export interface Task {
  id: string
  title: string
  description: string
  columnId: string
  createdAt: string
  completed: boolean
  completedAt?: string
  ticket?: string
}

export function getTaskType(task: Task): TaskType {
  return task.ticket ? 'work' : 'personal'
}

export interface AppData {
  columns: Column[]
  tasks: Task[]
  prompts: Record<TaskType, string>
}
