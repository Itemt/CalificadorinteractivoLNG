const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─── Global crash logger (se guarda en la carpeta de datos del programa) ──────
let logPath;
function writeLog(msg) {
  try {
    if (!logPath) {
      const dataDir = app.getPath('userData');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      logPath = path.join(dataDir, 'calificador_crash.log');
    }
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  } catch (_) {}
}

process.on('uncaughtException', (err) => {
  writeLog('uncaughtException: ' + err.stack);
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  writeLog('unhandledRejection: ' + reason);
});
// ─────────────────────────────────────────────────────────────────────────────

// Necesario para que Electron funcione desde rutas de red en Windows (ej. Parallels)
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-setuid-sandbox');

function createWindow () {
  writeLog('createWindow() called. __dirname=' + __dirname);
  // Seleccionar icono según plataforma para barra de tareas, dock y ventana
  const iconFile = process.platform === 'win32'  ? 'build/icon.ico'
                 : process.platform === 'darwin' ? 'build/icon.icns'
                 :                                 'assets/icon.png';
  const iconPath = path.join(__dirname, iconFile);
  writeLog('iconPath=' + iconPath + ' exists=' + fs.existsSync(iconPath));

  const windowOptions = {
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  };

  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }

  try {
    writeLog('Creating BrowserWindow...');
    const mainWindow = new BrowserWindow(windowOptions);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.autoHideMenuBar = true;

    // Captura crashes del proceso renderizador (HTML/JS)
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      writeLog('RENDERER CRASH: reason=' + details.reason + ' exitCode=' + details.exitCode);
    });
    mainWindow.webContents.on('did-fail-load', (event, code, desc, url) => {
      writeLog('DID-FAIL-LOAD: code=' + code + ' desc=' + desc + ' url=' + url);
    });
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 2) { // 2=warning, 3=error
        writeLog('CONSOLE [lvl' + level + '] line=' + line + ': ' + message + ' (' + sourceId + ')');
      }
    });

    writeLog('Loading index.html...');
    mainWindow.loadFile('index.html');
    writeLog('Window created successfully.');
  } catch (err) {
    writeLog('createWindow error: ' + err.stack);
  }
}

app.whenReady().then(() => {
  writeLog('app is ready.');
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  writeLog('window-all-closed event.');
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
