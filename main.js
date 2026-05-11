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

  mainWindow.setMenuBarVisibility(false);
  mainWindow.autoHideMenuBar = true;

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

ipcMain.handle('fs:checkExists', async (event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('fs:saveBackup', async (event, data) => {
  try {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const backupPath = path.join(backupDir, `backup_${timestamp}.csv`);
    
    fs.writeFileSync(backupPath, data, 'utf8');
    
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.csv'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); 
      
    if (files.length > 5) {
      for (let i = 5; i < files.length; i++) {
        fs.unlinkSync(path.join(backupDir, files[i].name));
      }
    }
    return true;
  } catch (err) {
    console.error("Backup failed:", err);
    return false;
  }
});
