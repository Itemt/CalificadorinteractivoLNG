const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showSaveFilePicker: (options) => ipcRenderer.invoke('dialog:showSaveFilePicker', options),
  showOpenFilePicker: (options) => ipcRenderer.invoke('dialog:showOpenFilePicker', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  checkExists: (filePath) => ipcRenderer.invoke('fs:checkExists', filePath),
  saveBackup: (data) => ipcRenderer.invoke('fs:saveBackup', data),
  
  // Auto-updater communication channels
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, errorMsg) => callback(errorMsg));
  },
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall')
});
