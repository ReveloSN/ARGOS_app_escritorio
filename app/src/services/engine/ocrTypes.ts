/** OCR (engine/argus/api/schemas/ocr.py): Tesseract local y Google Document AI opcional. */

export type OcrProviderValue = "local" | "cloud";

export interface OcrSettingsResult {
  readonly isLocalAvailable: boolean;
  readonly usesCloud: boolean;
  readonly projectId: string;
  readonly location: string;
  readonly processorId: string;
  readonly hasCredentials: boolean;
  readonly isKeychainAvailable: boolean;
  /** Document AI activado, con procesador y clave: «Activar OCR» puede ofrecerlo. */
  readonly isCloudReady: boolean;
}

export interface OcrProcessorInput {
  readonly projectId: string;
  readonly location: string;
  readonly processorId: string;
}

/** Puerto de la interfaz para Ajustes › OCR; el cliente HTTP lo implementa. */
export interface OcrGateway {
  ocrSettings(): Promise<OcrSettingsResult>;
  setUsesCloud(enabled: boolean): Promise<OcrSettingsResult>;
  setProcessor(processor: OcrProcessorInput): Promise<OcrSettingsResult>;
  storeCredentials(credentials: string): Promise<OcrSettingsResult>;
  removeCredentials(): Promise<OcrSettingsResult>;
}
