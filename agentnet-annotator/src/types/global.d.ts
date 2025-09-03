import { Channels } from "..preload";

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, ...args: unknown[]): void;
        on(
          channel: string,
          func: (...args: unknown[]) => void
        ): (() => void) | undefined;
        once(channel: string, func: (...args: unknown[]) => void): void;
        off(
          channel: string,
          func: (...args: unknown[]) => void
        ): (() => void) | undefined;
      };
    };
  }
}

export {};
