export interface Column {
  id: string
  name: string
}

export type TaskType = 'work' | 'personal' | 'agent_generated'
export type WorkStatus = 'idle' | 'in_progress' | 'agent' | 'available'

export interface Task {
  id: string
  title: string
  description: string
  columnId: string
  createdAt: string
  completed: boolean
  completedAt?: string
  ticket?: string
  status?: WorkStatus
  agentGenerated?: boolean
}

export function getTaskType(task: Task): TaskType {
  if (task.agentGenerated) return 'agent_generated'
  return task.ticket ? 'work' : 'personal'
}

export interface AppData {
  columns: Column[]
  tasks: Task[]
  prompts: Record<TaskType, string>
}
