import { app, shell, BrowserWindow, ipcMain, Notification } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createServer, IncomingMessage, ServerResponse } from 'http'
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
}

interface AppData {
  columns: { id: string; name: string }[]
  tasks: Task[]
  prompts?: Record<string, string>
}

const store = new Store<{ appData: object }>({
  defaults: {
    appData: { columns: [], tasks: [] }
  }
})

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
    description: `Branch: ${branchName}\nPR: ${prUrl}`,
    columnId: task.columnId,
    createdAt: new Date().toISOString(),
    completed: false,
    status: 'idle',
    agentGenerated: true
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
  const mainWindow = new BrowserWindow({
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
    mainWindow.show()
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

  ipcMain.handle('task:agent-complete', (_event, { taskId, branchName, prUrl }: { taskId: string; branchName: string; prUrl: string }) => {
    return agentCompleteTask(taskId, branchName, prUrl)
  })

  startHttpServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
