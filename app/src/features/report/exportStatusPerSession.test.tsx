import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/I18nProvider";
import type { ReportLocation } from "../../services/engine/reportTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { EngineServicesContext } from "../engine/EngineServicesContext";
import { useReportExport } from "./useReportExport";

const PLAN = { folder: "Documentos/ARGUS/A", fileName: "Informe_A", version: "0.1.0" };
const DOCUMENT = {
  title: "Informe",
  subtitles: [],
  brand: "ARGUS",
  sections: [],
  footer: "",
  pageLabel: "",
};

describe("estado de la exportación por sesión", () => {
  it("(regresión) lo que termina en A no borra la exportación en curso de B", async () => {
    const pending: ((location: ReportLocation) => void)[] = [];
    const exportReport = vi.fn(
      () =>
        new Promise<ReportLocation>((resolve) => {
          pending.push(resolve);
        }),
    );
    const services = fakeEngineServices({
      reports: { planReport: () => Promise.resolve(PLAN), exportReport },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider initialLocale="es">
        <EngineServicesContext.Provider value={services}>{children}</EngineServicesContext.Provider>
      </I18nProvider>
    );
    const { result, rerender } = renderHook(({ sessionId }) => useReportExport(sessionId), {
      initialProps: { sessionId: "s-1" },
      wrapper,
    });

    act(() => {
      result.current.exportReport(DOCUMENT);
    });
    rerender({ sessionId: "s-2" });
    act(() => {
      result.current.exportReport(DOCUMENT);
    });
    await act(async () => {
      pending[0]?.({ folder: PLAN.folder, fileName: "Informe_A.pdf" });
      await Promise.resolve();
    });

    expect(result.current.status).toEqual({ kind: "exporting" });
  });
});
