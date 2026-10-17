/** Lo que solo existe en la app de escritorio (Tauri); en el navegador no hay equivalente. */
export interface DesktopShell {
  /** Abre el selector de carpetas del sistema; `null` si el usuario lo cierra sin elegir. */
  pickFolder(title: string): Promise<string | null>;
  /** Reinicia el motor local para que lea la nueva carpeta del historial. */
  restartEngine(): Promise<void>;
}
