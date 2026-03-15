import { app, shell, BrowserWindow, ipcMain, Notification, Tray, nativeImage, globalShortcut } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { spawn, execSync, ChildProcess } from 'child_process'
import Store from 'electron-store'

const PORT = 7842

interface Task {
  id: string
  title: string
  description: string
  columnId: string
  createdAt: string
  completed: boolean
  completedAt?: string
  ticket?: string
  status?: string
  agentGenerated?: boolean
  agentId?: string
  prUrl?: string
}

type RecurrenceRule =
  | { kind: 'once';         date: string }
  | { kind: 'daily' }
  | { kind: 'every_n_days'; n: number }
  | { kind: 'weekly';       dayOfWeek: number }
  | { kind: 'monthly';      dayOfMonth: number }

interface ScheduledTask {
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

interface AppData {
  columns: { id: string; name: string }[]
  tasks: Task[]
  prompts?: Record<string, string>
  scheduledTasks?: ScheduledTask[]
}

const store = new Store<{ appData: object; settings: { jiraToken?: string } }>({
  defaults: {
    appData: { columns: [], tasks: [] },
    settings: {}
  }
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

interface AgentEntry {
  agentId: string
  process: ChildProcess
  worktreePath: string
}
const activeAgents = new Map<string, AgentEntry>()

function createTrayIcon(): Electron.NativeImage {
  // 16x16 RGBA — draw a minimal "T" shape as a template image
  const size = 16
  const buf = Buffer.alloc(size * size * 4, 0)
  const set = (x: number, y: number) => {
    const i = (y * size + x) * 4
    buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 255
  }
  // Horizontal bar (row 3, columns 2–13)
  for (let x = 2; x <= 13; x++) set(x, 3)
  // Vertical stem (rows 3–13, column 7–8)
  for (let y = 3; y <= 13; y++) { set(7, y); set(8, y) }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size })
  icon.setTemplateImage(true)
  return icon
}

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isDue(s: ScheduledTask, now: Date): boolean {
  if (s.timeOfDay !== hhmm(now)) return false
  const r = s.recurrence
  const today = toDateStr(now)
  const lastDay = s.lastFiredAt ? toDateStr(new Date(s.lastFiredAt)) : null
  if (r.kind === 'once') return r.date === today && lastDay === null
  if (lastDay === today) return false
  if (r.kind === 'daily') return true
  if (r.kind === 'every_n_days') {
    if (!s.lastFiredAt) return true
    return Math.floor((now.getTime() - new Date(s.lastFiredAt).getTime()) / 86_400_000) >= r.n
  }
  if (r.kind === 'weekly') return now.getDay() === r.dayOfWeek
  if (r.kind === 'monthly') return now.getDate() === r.dayOfMonth
  return false
}

function startScheduler(): void {
  setInterval(() => {
    const now = new Date()
    const data = store.get('appData') as AppData
    const scheduled = data.scheduledTasks ?? []
    if (scheduled.length === 0) return

    let dirty = false
    const newTasks: Task[] = []
    const updatedScheduled = scheduled.map((s) => {
      if (!isDue(s, now)) return s
      dirty = true
      const task: Task = {
        id: randomUUID(),
        title: s.title,
        description: s.description,
        columnId: s.columnId,
        createdAt: now.toISOString(),
        completed: false,
        status: 'idle',
        ...(s.ticket ? { ticket: s.ticket } : {})
      }
      newTasks.push(task)
      new Notification({
        title: 'Scheduled task added',
        body: `"${s.title}" has been added to your board.`,
        sound: 'default'
      }).show()
      return { ...s, lastFiredAt: now.toISOString() }
    })

    if (dirty) {
      store.set('appData', { ...data, tasks: [...data.tasks, ...newTasks], scheduledTasks: updatedScheduled })
      notifyRenderer()
    }
  }, 60_000)
}

function notifyRenderer(): void {
  BrowserWindow.getAllWindows().forEach((win) => win.webContents.send('store:changed'))
}

function agentCompleteTask(taskId: string, branchName: string, prUrl: string): { success: boolean; reviewTaskId?: string; error?: string } {
  const data = store.get('appData') as AppData
  const task = data.tasks.find((t) => t.id === taskId)
  if (!task) return { success: false, error: 'Task not found' }
  if (task.agentGenerated) return { success: false, error: 'Agent-generated tasks can only be completed by the user' }
  if (task.status !== 'agent') return { success: false, error: 'Task is not in agent status. The agent must pick up the task before completing it.' }

  const updatedTasks = data.tasks.map((t) =>
    t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString(), status: 'idle' } : t
  )

  const reviewTask: Task = {
    id: randomUUID(),
    title: 'Review PR',
    description: `Branch: ${branchName}`,
    columnId: task.columnId,
    createdAt: new Date().toISOString(),
    completed: false,
    status: 'idle',
    agentGenerated: true,
    prUrl
  }

  const firstInColumn = updatedTasks.findIndex((t) => t.columnId === task.columnId && !t.completed)
  if (firstInColumn === -1) {
    updatedTasks.push(reviewTask)
  } else {
    updatedTasks.splice(firstInColumn, 0, reviewTask)
  }

  store.set('appData', { ...data, tasks: updatedTasks })
  notifyRenderer()

  new Notification({
    title: 'PR Ready for Review',
    body: `"${task.title}" is complete — a Review PR task needs your attention.`,
    sound: 'default'
  }).show()

  return { success: true, reviewTaskId: reviewTask.id }
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body || 'null')) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

function startHttpServer(): void {
  const server = createServer(async (req, res) => {
    const url = req.url ?? '/'
    const method = req.method ?? 'GET'

    // GET /tasks — list all incomplete tasks with column name
    if (method === 'GET' && url === '/tasks') {
      const data = store.get('appData') as AppData
      const tasks = data.tasks
        .filter((t) => !t.completed)
        .map((t) => ({
          ...t,
          columnName: data.columns.find((c) => c.id === t.columnId)?.name ?? null
        }))
      return send(res, 200, tasks)
    }

    // POST /task/agent-complete — complete a task and create a Review PR task
    if (method === 'POST' && url === '/task/agent-complete') {
      try {
        const body = await readBody(req) as { taskId?: string; branchName?: string; prUrl?: string }
        if (!body?.taskId || !body?.branchName || !body?.prUrl) {
          return send(res, 400, { error: 'taskId, branchName, and prUrl are required' })
        }
        const result = agentCompleteTask(body.taskId, body.branchName, body.prUrl)
        return send(res, result.success ? 200 : 404, result)
      } catch {
        return send(res, 400, { error: 'Invalid JSON body' })
      }
    }

    send(res, 404, { error: 'Not found' })
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Task manager API listening on http://127.0.0.1:${PORT}`)
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#111118',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !isQuitting) {
      e.preventDefault()
      mainWindow!.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setName('Task Manager')
  app.setAppUserModelId('com.personal.taskmanager')

  ipcMain.handle('store:read', () => {
    return store.get('appData')
  })

  ipcMain.handle('store:write', (_event, data) => {
    store.set('appData', data)
  })

  ipcMain.handle('settings:get', () => {
    return store.get('settings')
  })

  ipcMain.handle('settings:set', (_event, settings: { jiraToken?: string }) => {
    store.set('settings', settings)
  })

  ipcMain.handle('task:agent-complete', (_event, { taskId, branchName, prUrl }: { taskId: string; branchName: string; prUrl: string }) => {
    return agentCompleteTask(taskId, branchName, prUrl)
  })

  ipcMain.handle('agent:input', (_event, { taskId, text }: { taskId: string; text: string }) => {
    const entry = activeAgents.get(taskId)
    if (!entry) return { success: false, error: 'No active agent for task' }
    entry.process.stdin?.write(text + '\n')
    return { success: true }
  })

  ipcMain.handle('agent:spawn', async (_event, { taskId, taskDescription, repoPath }: { taskId: string; taskDescription: string; repoPath: string }) => {
    console.log(`[agent:spawn] taskId=${taskId} repoPath=${repoPath}`)
    const agentId = randomUUID()

    // Update task: status = 'agent', agentId
    const data = store.get('appData') as AppData
    const updatedTasks = data.tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'agent', agentId } : t
    )
    store.set('appData', { ...data, tasks: updatedTasks })
    notifyRenderer()

    // Create git worktree
    const worktreePath = join(repoPath, '..', '.task-worktrees', `task-${taskId}`)
    console.log(`[agent:spawn] creating worktree at ${worktreePath}`)
    try {
      execSync(`git worktree add "${worktreePath}" -b "task/${taskId}"`, { cwd: repoPath })
      console.log(`[agent:spawn] worktree created`)
    } catch (err) {
      console.error(`[agent:spawn] worktree failed:`, err)
      const d = store.get('appData') as AppData
      store.set('appData', {
        ...d,
        tasks: d.tasks.map((t) => t.id === taskId ? { ...t, status: 'available', agentId: undefined } : t)
      })
      notifyRenderer()
      return { success: false, error: String(err) }
    }

    // Spawn claude — extend PATH so the binary is found when launched outside a shell
    const settings = store.get('settings')
    const spawnEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.HOME ?? ''}/.local/bin:${process.env.PATH ?? '/usr/bin:/bin'}`,
      ...(settings.jiraToken ? { JIRA_API_TOKEN: settings.jiraToken } : {})
    }
    console.log(`[agent:spawn] spawning claude in ${worktreePath}`)
    const claudeProcess = spawn(
      'claude',
      ['--dangerously-skip-permissions', '-p', taskDescription],
      { cwd: worktreePath, stdio: ['ignore', 'pipe', 'pipe'], env: spawnEnv }
    )
    console.log(`[agent:spawn] claude pid=${claudeProcess.pid}`)

    activeAgents.set(taskId, { agentId, process: claudeProcess, worktreePath })

    const emit = (chunk: Buffer) => {
      const text = chunk.toString()
      process.stdout.write(`[agent ${taskId.slice(0, 8)}] ${text}`)
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send('agent:log', { taskId, chunk: text })
      )
    }
    claudeProcess.stdout?.on('data', emit)
    claudeProcess.stderr?.on('data', emit)

    claudeProcess.on('exit', (code) => {
      console.log(`[agent:spawn] claude exited taskId=${taskId} code=${code}`)
      activeAgents.delete(taskId)
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send('agent:exited', { taskId, code })
      )
    })

    return { success: true, agentId }
  })

  tray = new Tray(createTrayIcon())
  tray.setToolTip('Task Manager')
  tray.on('click', () => {
    if (!mainWindow) createWindow()
    else { mainWindow.show(); mainWindow.focus() }
  })

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (!mainWindow) createWindow()
    mainWindow!.show()
    mainWindow!.focus()
    mainWindow!.webContents.send('quickcapture:show')
  })

  startHttpServer()
  startScheduler()
  createWindow()

  app.on('activate', () => {
    if (!mainWindow) createWindow()
    else { mainWindow.show(); mainWindow.focus() }
  })
})

app.on('before-quit', (event) => {
  isQuitting = true
  if (activeAgents.size === 0) return

  event.preventDefault()

  const data = store.get('appData') as AppData
  const agentTaskIds = new Set(activeAgents.keys())
  store.set('appData', {
    ...data,
    tasks: data.tasks.map((t) => {
      if (!agentTaskIds.has(t.id)) return t
      const { agentId: _removed, ...rest } = t
      return rest
    })
  })

  for (const [taskId, entry] of activeAgents) {
    entry.process.kill()
    activeAgents.delete(taskId)
  }

  app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
