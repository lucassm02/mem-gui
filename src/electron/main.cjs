const { app, BrowserWindow, screen } = require('electron');
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
    detached: true,
    stdio: 'ignore',
  });

  const iconPath = path.join(__dirname, '..', '..', 'assets', 'mem-gui.ico');

  const mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: iconPath,
  });

  const startURL = isDev
    ? 'http://localhost:5173'
    : 'http://localhost:33080/index.html';

  mainWindow.loadURL(startURL);
  mainWindow.maximize();

  mainWindow.on('closed', () => {
    if (apiProcess) {
      apiProcess.kill();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
