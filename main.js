const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for file system
ipcMain.handle('dialog:showSaveFilePicker', async (event, options) => {
  const { filePath, canceled } = await dialog.showSaveDialog(options);
  return { filePath, canceled };
});

ipcMain.handle('dialog:showOpenFilePicker', async (event, options) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(options);
  if (!canceled && filePaths.length > 0) {
    return { filePath: filePaths[0], canceled };
  }
  return { canceled: true };
});

ipcMain.handle('fs:writeFile', async (event, filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, 'utf8', (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
});
