import { contextBridge, ipcRenderer } from 'electron'
import { AppData } from '../../src/types'

contextBridge.exposeInMainWorld('store', {
  read: (): Promise<AppData> => ipcRenderer.invoke('store:read'),
  write: (data: AppData): Promise<void> => ipcRenderer.invoke('store:write', data)
})
