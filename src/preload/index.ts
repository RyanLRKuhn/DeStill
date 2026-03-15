import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('store', {
  read: () => ipcRenderer.invoke('store:read'),
  write: (data: unknown) => ipcRenderer.invoke('store:write', data),
  agentCompleteTask: (params: { taskId: string; branchName: string; prUrl: string }) =>
    ipcRenderer.invoke('task:agent-complete', params),
  onChanged: (callback: () => void) => {
    ipcRenderer.on('store:changed', callback)
    return () => ipcRenderer.removeListener('store:changed', callback)
  },
  onQuickCapture: (callback: () => void) => {
    ipcRenderer.on('quickcapture:show', callback)
    return () => ipcRenderer.removeListener('quickcapture:show', callback)
  }
})

contextBridge.exposeInMainWorld('settings', {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (settings: { jiraToken?: string; jiraEmail?: string; jiraBaseUrl?: string; jiraStatusFilters?: string[]; repos?: { id: string; name: string; path: string }[]; jiraEnabled?: boolean }) =>
    ipcRenderer.invoke('settings:set', settings)
})

contextBridge.exposeInMainWorld('jira', {
  fetchProjects: (params: { baseUrl: string; email: string; token: string }) =>
    ipcRenderer.invoke('jira:fetch-projects', params),
  fetchStatuses: (params: { baseUrl: string; email: string; token: string; projectKey: string }) =>
    ipcRenderer.invoke('jira:fetch-statuses', params)
})

contextBridge.exposeInMainWorld('agent', {
  spawn: (params: { taskId: string; taskDescription: string; repoPath: string }) =>
    ipcRenderer.invoke('agent:spawn', params),

  sendInput: (params: { taskId: string; text: string }) =>
    ipcRenderer.invoke('agent:input', params),

  onLog: (callback: (payload: { taskId: string; chunk: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { taskId: string; chunk: string }) =>
      callback(payload)
    ipcRenderer.on('agent:log', handler)
    return () => ipcRenderer.removeListener('agent:log', handler)
  },

  onExited: (callback: (payload: { taskId: string; code: number | null }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { taskId: string; code: number | null }) =>
      callback(payload)
    ipcRenderer.on('agent:exited', handler)
    return () => ipcRenderer.removeListener('agent:exited', handler)
  }
})
