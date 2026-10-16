/** Ajustes de la interfaz que se recuerdan entre ejecuciones: idioma, formato regional y tema. */
export interface PreferenceStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

/**
 * Almacenamiento local del navegador. Si no está disponible (bloqueado o lleno), el ajuste
 * sigue valiendo durante esta ejecución y la app arranca la próxima vez con el predeterminado.
 */
export const browserPreferenceStorage: PreferenceStorage = {
  read: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ver la explicación de arriba: sin almacenamiento, el ajuste dura solo esta ejecución.
    }
  },
};

/** Lee un ajuste guardado solo si es uno de los valores válidos. */
export function readChoice<Value extends string>(
  storage: PreferenceStorage | undefined,
  key: string,
  allowed: readonly Value[],
): Value | undefined {
  const stored = storage?.read(key);
  return allowed.find((value) => value === stored);
}
