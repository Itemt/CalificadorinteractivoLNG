const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater
autoUpdater.autoDownload = false;

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

// Configurar logger para autoUpdater
autoUpdater.logger = {
  info: (msg) => writeLog('INFO: ' + msg),
  warn: (msg) => writeLog('WARN: ' + msg),
  error: (msg) => writeLog('ERROR: ' + msg)
};

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

function setupAutoUpdater(mainWindow) {
  autoUpdater.on('checking-for-update', () => {
    writeLog('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    writeLog('Update available: ' + JSON.stringify(info));
    mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    writeLog('Update not available: ' + JSON.stringify(info));
    mainWindow.webContents.send('update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    const errMsg = err && (err.stack || err.message || err);
    writeLog('Update error: ' + errMsg);
    mainWindow.webContents.send('update-error', err.message || String(err));
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    writeLog('Update downloaded: ' + JSON.stringify(info));
    mainWindow.webContents.send('update-downloaded', info);
  });
}

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

    // Configurar y buscar actualizaciones
    setupAutoUpdater(mainWindow);
    setTimeout(() => {
      if (app.isPackaged) {
        autoUpdater.checkForUpdates().catch((err) => {
          writeLog('Error checking for updates on startup: ' + err.message);
        });
      } else {
        writeLog('App not packaged, skipping auto check for updates.');
      }
    }, 5000);
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

// IPC Handlers for Auto-updater
ipcMain.handle('app:checkForUpdates', async () => {
  try {
    if (app.isPackaged) {
      return await autoUpdater.checkForUpdates();
    }
    writeLog('app:checkForUpdates called in development, skipping.');
    return null;
  } catch (err) {
    writeLog('app:checkForUpdates error: ' + err.message);
    throw err;
  }
});

ipcMain.handle('app:downloadUpdate', async () => {
  try {
    if (app.isPackaged) {
      return await autoUpdater.downloadUpdate();
    }
    writeLog('app:downloadUpdate called in development, skipping.');
    return null;
  } catch (err) {
    writeLog('app:downloadUpdate error: ' + err.message);
    throw err;
  }
});

ipcMain.handle('app:quitAndInstall', () => {
  try {
    autoUpdater.quitAndInstall();
  } catch (err) {
    writeLog('app:quitAndInstall error: ' + err.message);
  }
});

let oauthServer = null;

ipcMain.handle('gdrive:start-oauth-server', async (event) => {
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      try {
        oauthServer.close();
      } catch (e) {}
      oauthServer = null;
    }

    oauthServer = http.createServer((req, res) => {
      const urlParams = new URL(req.url, `http://${req.headers.host}`);
      const code = urlParams.searchParams.get('code');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (code) {
        res.end(`
          <html>
            <body style="font-family: 'Nunito', sans-serif, system-ui; text-align: center; padding: 50px; background-color: #0d0d1a; color: #f0f0ff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; margin: 0;">
              <div style="background: #13132a; padding: 40px; border-radius: 16px; border: 1px solid #2e2e5a; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h1 style="color: #10b981; margin-bottom: 20px;">✓ ¡Autenticación Completada!</h1>
                <p style="font-size: 1.1rem; color: #9090c0;">Puedes cerrar esta pestaña y volver al Calificador Interactivo LNG.</p>
              </div>
            </body>
          </html>
        `);
        resolve(code);
      } else {
        res.end(`
          <html>
            <body style="font-family: 'Nunito', sans-serif, system-ui; text-align: center; padding: 50px; background-color: #0d0d1a; color: #f0f0ff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; margin: 0;">
              <div style="background: #13132a; padding: 40px; border-radius: 16px; border: 1px solid #2e2e5a; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h1 style="color: #ef4444; margin-bottom: 20px;">✗ Error de Autenticación</h1>
                <p style="font-size: 1.1rem; color: #9090c0;">No se pudo capturar el código de autorización de Google. Por favor, vuelve a intentarlo.</p>
              </div>
            </body>
          </html>
        `);
        reject(new Error('No auth code found'));
      }

      setTimeout(() => {
        if (oauthServer) {
          try {
            oauthServer.close();
          } catch (e) {}
          oauthServer = null;
        }
      }, 1000);
    });

    oauthServer.on('error', (err) => {
      oauthServer = null;
      reject(err);
    });

    oauthServer.listen(8585, 'localhost', () => {
      // Server successfully started
    });

    // Timeout: close server if user doesn't authenticate in 3 minutes
    setTimeout(() => {
      if (oauthServer) {
        try {
          oauthServer.close();
        } catch (e) {}
        oauthServer = null;
        reject(new Error('OAuth server timeout'));
      }
    }, 180000);
  });
});

ipcMain.handle('app:open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (err) {
    writeLog('Error opening external link: ' + err.message);
    return false;
  }
});

