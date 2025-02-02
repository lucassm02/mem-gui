const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const net = require('net');

const DEFAULT_SERVER_PORT = 33080;

const isDev = !app.isPackaged;

const serverPath = isDev
  ? path.join(__dirname, '../../dist/server/index.cjs')
  : path.join(process.resourcesPath, 'server/index.cjs');

const startURL = isDev
  ? 'http://localhost:5173'
  : `http://localhost:${DEFAULT_SERVER_PORT}/index.html`;

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

app.whenReady().then(async () => {
  try {
    const { server } = require(serverPath);

    const isUsed = await isPortInUse(DEFAULT_SERVER_PORT);

    if (!isUsed) {
      await server.listen(DEFAULT_SERVER_PORT);
    }
  } catch (error) {
    console.error('Unable to create a new http sever', error);
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

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

  mainWindow.loadURL(startURL);

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
