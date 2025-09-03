import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

export type Channels =
  | "minimize-window"
  | "maximize-window"
  | "close-window"
  | "toggle-record";

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    off(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.removeListener(channel, func);
    },
  },
  updateTrayIcon: (iconPath: string) =>
    ipcRenderer.send("update-tray-icon", iconPath),
  updateTrayTitle: (title: string) =>
    ipcRenderer.send("update-tray-title", title),
});
