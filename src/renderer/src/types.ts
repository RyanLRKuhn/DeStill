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

export type RecurrenceRule =
  | { kind: 'once';         date: string }
  | { kind: 'daily' }
  | { kind: 'every_n_days'; n: number }
  | { kind: 'weekly';       dayOfWeek: number }
  | { kind: 'monthly';      dayOfMonth: number }

export interface ScheduledTask {
  id: string
  columnId: string
  title: string
  description: string
  ticket?: string
  timeOfDay: string
  recurrence: RecurrenceRule
  lastFiredAt?: string
  createdAt: string
}

export interface AppData {
  columns: Column[]
  tasks: Task[]
  prompts: Record<TaskType, string>
  scheduledTasks: ScheduledTask[]
}
