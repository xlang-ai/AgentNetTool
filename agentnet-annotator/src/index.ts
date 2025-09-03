import {
  app,
  BrowserWindow,
  screen,
  dialog,
  ipcMain,
  globalShortcut,
  shell,
  Notification,
  protocol,
  Menu,
  nativeImage,
  Tray,
} from "electron";
import { spawn, ChildProcess, execSync } from "child_process";
import axios from "axios";
import path from "path";
import { SERVER_URL } from "./public/constant";
import { createTray, StartRecording, StopRecording, updateTrayIcon } from "./trayicon";

const log = require("electron-log");

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let tray: Tray | null = null;
if (require("electron-squirrel-startup")) {
  app.quit();
}


let mainWindow: BrowserWindow | null = null;
let flaskProcess: ChildProcess | null = null;

const createWindow = (): void => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

const startFlaskServer = (): void => {
  if (app.isPackaged) {
    flaskProcess = spawn(path.join(process.resourcesPath, "backend/backend"), {
      env: { ...process.env },
      shell: false,
    });
  } else {
    flaskProcess = spawn("python", ["api/backend.py"], {
      env: { ...process.env, FLASK_DEBUG: "1" },
      shell: true,
    });
  }

  flaskProcess.stdout.on("data", (data) => {
    console.log(`Flask stdout: ${data}`);
  });

  flaskProcess.stderr.on("data", (data) => {
    console.error(`Flask stderr: ${data}`);
  });

  flaskProcess.on("close", (code) => {
    console.log(`Flask process exited with code ${code}`);
  });
};

const stopFlaskServer = (): void => {
  if (flaskProcess) {
    flaskProcess.kill();
    flaskProcess = null;
  }
};

const checkFlaskServer = async (): Promise<void> => {
  try {
    await axios.get("http://localhost:5328/api/recordings");
    if (process.platform === "darwin") {
      await axios.get("http://localhost:5328/api/check_permissions");
    }
    createWindow();
  } catch (error) {
    console.log("Waiting for Flask server to start...");
    setTimeout(checkFlaskServer, 1000);
  }
};

app.on("ready", () => {
  startFlaskServer();
  log.info("Flask server started");
  checkFlaskServer();
  log.info("Checked Flask server");

  ipcMain.on("start-record-icon", () => {
    StartRecording();
    tray?.setTitle("Recording...");
  });
  ipcMain.on("stop-record-icon", () => {
    StopRecording();
    tray?.setTitle("AgentNet");
  });

  ipcMain.on("tree-start", () => {
    updateTrayIcon("red");
    tray?.setTitle("Please Don't move....");
  });

  ipcMain.on("tree-end", () => {
    updateTrayIcon("green");
    tray?.setTitle("Recording...");
  });

  globalShortcut.register("CommandOrControl+Alt+R", () => {
    mainWindow?.webContents.send("start-record");
  });

  globalShortcut.register("CommandOrControl+Alt+T", () => {
    mainWindow?.webContents.send("stop-record");
  });

  // TODO: Add global shortcuts for AXTree: CommandOrControl+Shift+T
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    mainWindow?.webContents.send("get-axtree");
  });

  ipcMain.on("minimize-window", () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on("maximize-window", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("get_os_system", () => {
    log.info("Received get_os_system request");
    mainWindow?.webContents.send("get_os_system_response", process.platform);
  });
});

app.whenReady().then(() => {
  tray = createTray(app);
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.pop();
    console.log(`You arrived from ${url}`);
  });
}


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", async () => {
  if (process.platform === "win32") {
    await kill_process(5328);
  }
  stopFlaskServer();
  globalShortcut.unregisterAll();
});

function kill_process(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Checking for processes using port ${port}...`);

    try {
      const stdout = execSync("netstat -ano").toString();
      const lines = stdout.split("\n");
      const pids = new Set<number>();

      for (const line of lines) {
        if (line.includes(`:${port}`)) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(pid) && pid !== 0) {
            pids.add(pid);
          }
        }
      }

      if (pids.size === 0) {
        console.log(`No processes found using port ${port}.`);
        resolve();
        return;
      }

      pids.forEach((pid) => {
        console.log(`Killing process with PID ${pid} using port ${port}.`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Successfully killed process with PID ${pid}.`);
        } catch (error) {
          console.error(`Failed to kill process with PID ${pid}: ${error}`);
        }
      });

      resolve();
    } catch (error) {
      console.error(`Failed to run netstat command: ${error}`);
      reject(error);
    }
  });
}
