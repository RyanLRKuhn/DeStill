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
