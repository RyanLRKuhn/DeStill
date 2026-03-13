/// <reference types="vite/client" />

import { AppData } from './types'

declare global {
  interface Window {
    store: {
      read: () => Promise<AppData>
      write: (data: AppData) => Promise<void>
    }
  }
}
