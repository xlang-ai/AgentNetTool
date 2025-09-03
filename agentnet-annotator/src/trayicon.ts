import { Tray, Menu, nativeImage } from "electron";
import { ICON_BASE64 } from "./iconBase64";
import { START } from "./Start";
import { STOP } from "./Stop";

let tray: Tray | null = null;
let old_color: string = "green";
let is_recording: boolean = false;
export function createTray(app: Electron.App): Tray {
  const icon = nativeImage
    .createFromDataURL(ICON_BASE64)
    .resize({ width: 16, height: 16 });

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setTitle("AgentNet");
  tray.setContextMenu(contextMenu);

  return tray;
}
export function updateTrayIcon(color: string, rule: boolean = false): void {
  if (is_recording) {
    if (tray) {
      if (color === "green" && old_color === "red") {
        old_color = "green";
        const icon = nativeImage
          .createFromDataURL(START)
          .resize({ width: 16, height: 16 });
        tray.setImage(icon);
        tray?.setTitle("Recording...");
      } else if (color === "red" && old_color === "green") {
        old_color = "red";
        const icon = nativeImage
          .createFromDataURL(STOP)
          .resize({ width: 16, height: 16 });
        tray.setImage(icon);
        tray?.setTitle("Please Don't move....");
      }
    }
  }
}

export function StartRecording(): void {
  is_recording = true;
  if (tray) {
    const icon = nativeImage
      .createFromDataURL(START)
      .resize({ width: 16, height: 16 });
    tray.setImage(icon);
    tray?.setTitle("Recording...");
  }
}
export function StopRecording(): void {
  is_recording = false;
  if (tray) {
    const icon = nativeImage
      .createFromDataURL(ICON_BASE64)
      .resize({ width: 16, height: 16 });
    tray.setImage(icon);
    tray?.setTitle("AgentNet");
    old_color = "green";
  }
}
