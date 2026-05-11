const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showSaveFilePicker: (options) => ipcRenderer.invoke('dialog:showSaveFilePicker', options),
  showOpenFilePicker: (options) => ipcRenderer.invoke('dialog:showOpenFilePicker', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  checkExists: (filePath) => ipcRenderer.invoke('fs:checkExists', filePath),
  saveBackup: (data) => ipcRenderer.invoke('fs:saveBackup', data)
});
