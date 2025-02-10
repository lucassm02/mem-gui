const { app, BrowserWindow, ipcMain, screen, dialog } = require("electron");
const path = require("path");

const DEV_SERVER_PORT = 5173;

const isDev = !app.isPackaged;

const HOST = "http://localhost";

app.whenReady().then(async () => {
  let PRODUCTION_PORT = null;

  try {
    if (!isDev) {
      const serverPath = path.join(process.resourcesPath, "server.cjs");
      const { server } = require(serverPath);
      PRODUCTION_PORT = await server();
    }
  } catch (error) {
    app.quit();
  }

  const startURL = isDev
    ? `${HOST}:${DEV_SERVER_PORT}`
    : `${HOST}:${PRODUCTION_PORT}`;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const iconPath = path.join(__dirname, "..", "..", "asset", "mem-gui.ico");

  const mainWindow = new BrowserWindow({
    width: width - 100,
    height: height - 100,
    frame: false,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#1A1D2A",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: iconPath
  });

  mainWindow.loadURL(startURL);

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-maximized");
  });

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-unmaximized");
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

ipcMain.on("window-minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win && !win.isMaximized()) {
    win.maximize();
  }
});

ipcMain.on("window-unmaximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win && win.isMaximized()) {
    win.unmaximize();
  }
});
