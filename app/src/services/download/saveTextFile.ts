// La marca de orden de bytes hace que Excel reconozca el UTF-8 y muestre bien las tildes.
const UTF8_BYTE_ORDER_MARK = "﻿";

export interface TextFile {
  readonly name: string;
  readonly content: string;
  readonly type: string;
}

/** Entrega un archivo de texto generado en la interfaz como descarga del navegador. */
export function saveTextFile({ name, content, type }: TextFile): void {
  const blob = new Blob([UTF8_BYTE_ORDER_MARK, content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
