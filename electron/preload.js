const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  loadLatestData: () => ipcRenderer.invoke('load-latest-data'),
  listSaves: () => ipcRenderer.invoke('list-saves'),
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  importData: () => ipcRenderer.invoke('import-data')
});
