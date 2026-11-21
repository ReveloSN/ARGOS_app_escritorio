import { Fragment } from "react";

// Después de estos signos un nombre de archivo puede pasar de línea sin partir una palabra.
const BREAK_AFTER = /([_\-./\\])/;

/**
 * Texto con puntos de corte después de `_`, `-`, `.` y `/`: los nombres de archivo largos se
 * muestran completos y se parten por sus separadores, no a mitad de palabra. Copiar el texto
 * da el nombre original (los `<wbr>` no agregan caracteres).
 */
export function BreakableText({ text }: { readonly text: string }) {
  const parts = text.split(BREAK_AFTER);
  return (
    <>
      {parts.map((part, index) =>
        BREAK_AFTER.test(part) ? (
          <Fragment key={index}>
            {part}
            <wbr />
          </Fragment>
        ) : (
          part
        ),
      )}
    </>
  );
}
