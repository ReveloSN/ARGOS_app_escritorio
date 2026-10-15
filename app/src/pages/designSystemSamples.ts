import type { AlertRowData } from "../components/organisms/AlertList";
import type { ComparedValue } from "../components/organisms/ComparisonPanel";

/** Datos del expediente 2026-118 de los mockups, para ver los componentes con contenido real. */
export const SAMPLE_SESSION = {
  name: "Expediente 2026-118 · Arrendamiento Bodega Fontibón",
  summary: "7 alertas pendientes de 9",
};

export const SAMPLE_ROWS: readonly AlertRowData[] = [
  {
    id: "3",
    number: 3,
    risk: "high",
    title: "El canon mensual no coincide",
    subtitle: "Monto · Contrato_4857_v3.pdf p. 3, Anexo_2_tarifas.xlsx C12",
    valueA: "$ 18.450.000",
    valueB: "$ 18.540.000",
    decision: "pending",
  },
  {
    id: "4",
    number: 4,
    risk: "medium",
    title: "La fecha de inicio es distinta",
    subtitle: "Fecha · Contrato_4857_v3.pdf p. 2, Correo_remision_cliente.eml",
    valueA: "01/07/2026",
    valueB: "01/08/2026",
    decision: "error",
  },
  {
    id: "8",
    number: 8,
    risk: "low",
    title: "Razón social con otro formato",
    subtitle: "Nombre · Anexo_1_condiciones.pdf",
    valueA: "S.A.S.",
    valueB: "SAS",
    decision: "correct",
  },
];

export const SAMPLE_VALUE_A: ComparedValue = {
  value: "4857",
  positions: [2, 3],
  fileName: "Contrato_4857_v3.pdf",
  location: "Página 1 · Encabezado",
  occurrences: 6,
  files: 3,
};

export const SAMPLE_VALUE_B: ComparedValue = {
  value: "4587",
  positions: [2, 3],
  fileName: "Anexo_1_condiciones.pdf",
  location: "Página 2 · Cláusula primera",
  occurrences: 1,
  files: 1,
};

export const SAMPLE_ERROR = {
  what: "No pudimos leer «anexo_3.pdf».",
  why: "Es una imagen escaneada sin texto.",
  todo: "Súbalo de nuevo con texto seleccionable.",
  primary: "Reemplazar archivo",
};

export const SAMPLE_EMPTY = {
  title: "Todavía no hay revisiones",
  description:
    "Cargue los documentos que va a enviar o firmar. ARGUS los compara entre sí y le muestra las diferencias antes de que finalice.",
  note: "Los archivos se analizan en este equipo.",
};

export const SAMPLE_FILTERS = { active: "Riesgo: Alto, Medio", inactive: "Tipo: Todos" };
export const SAMPLE_STEPS = ["Cargar", "Confirmar lectura", "Revisar"];
