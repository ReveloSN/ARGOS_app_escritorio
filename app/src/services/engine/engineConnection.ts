export interface EngineConnection {
  readonly baseUrl: string;
  readonly token: string;
}

export type EngineConnectionState =
  | { readonly kind: "starting" }
  | { readonly kind: "ready"; readonly connection: EngineConnection }
  | { readonly kind: "failed" };

/** De dónde obtiene la interfaz la dirección y el token del motor (Tauri o configuración). */
export interface EngineConnectionSource {
  readConnectionState(): Promise<EngineConnectionState>;
}
