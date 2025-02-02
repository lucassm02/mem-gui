const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

const serverPath = isDev
  ? path.join(__dirname, '../../dist/server/index.cjs')
  : path.join(process.resourcesPath, 'server/index.cjs');

app.whenReady().then(() => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const apiProcess = spawn('node', [serverPath], {
    windowsHide: true,
    stdio: 'ignore',
  });

  const iconPath = path.join(__dirname, '..', '..', 'assets', 'mem-gui.ico');

  const mainWindow = new BrowserWindow({
    width: width - 100,
    height: height - 100,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1A1D2A',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: iconPath,
  });

  const startURL = isDev
    ? 'http://localhost:5173'
    : 'http://localhost:33080/index.html';

  mainWindow.loadURL(startURL);

  app.on('quit', () => {
    if (apiProcess) {
      try {
        process.kill(apiProcess.pid);
      } catch (error) {
        console.error('Erro ao encerrar o subprocesso:', error);
      }
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('window-close', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

ipcMain.on('window-minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win && !win.isMaximized()) {
    win.maximize();
  }
});

ipcMain.on('window-unmaximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win && win.isMaximized()) {
    win.unmaximize();
  }
});
