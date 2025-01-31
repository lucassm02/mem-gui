const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const apiPath = path.join(__dirname, '../../dist/api/server.cjs');
let apiProcess;

app.whenReady().then(() => {
  apiProcess = spawn('node', [apiPath], { stdio: 'inherit' });

  let mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startURL = 'http://localhost:5173';
  mainWindow.loadURL(startURL);

  mainWindow.on('closed', () => {
    if (apiProcess) {
      apiProcess.kill(); // Encerra API ao fechar Electron
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
