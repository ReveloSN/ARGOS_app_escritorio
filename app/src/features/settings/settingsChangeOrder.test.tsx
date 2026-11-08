import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/I18nProvider";
import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { EngineServicesContext } from "../engine/EngineServicesContext";
import { useOcrSettings } from "./useOcrSettings";

const BASE: OcrSettingsResult = {
  isLocalAvailable: true,
  usesCloud: true,
  projectId: "",
  location: "us",
  processorId: "",
  hasCredentials: false,
  isKeychainAvailable: true,
  isCloudReady: false,
};
const withProcessor = (processorId: string) => ({ ...BASE, processorId });

describe("guardados de OCR con respuestas en otro orden", () => {
  it("(regresión) queda el último procesador guardado, no la respuesta más lenta", async () => {
    const pending: ((result: OcrSettingsResult) => void)[] = [];
    const setProcessor = vi.fn(
      () =>
        new Promise<OcrSettingsResult>((resolve) => {
          pending.push(resolve);
        }),
    );
    const services = fakeEngineServices({
      ocr: { ocrSettings: () => Promise.resolve(BASE), setProcessor },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider initialLocale="es">
        <EngineServicesContext.Provider value={services}>{children}</EngineServicesContext.Provider>
      </I18nProvider>
    );
    const { result } = renderHook(() => useOcrSettings(vi.fn()), { wrapper });
    await act(() => Promise.resolve());

    act(() => {
      result.current.setProcessor({ projectId: "p", location: "us", processorId: "A" });
    });
    act(() => {
      result.current.setProcessor({ projectId: "p", location: "us", processorId: "B" });
    });
    await act(async () => {
      pending[1]?.(withProcessor("B"));
      await Promise.resolve();
    });
    await act(async () => {
      pending[0]?.(withProcessor("A"));
      await Promise.resolve();
    });

    expect(result.current.state).toEqual({ status: "ready", data: withProcessor("B") });
  });

  it("(regresión) el error de un guardado no se oculta por haber hecho otra acción después", async () => {
    let rejectCredentials: (error: Error) => void = () => undefined;
    const storeCredentials = vi.fn(
      () =>
        new Promise<OcrSettingsResult>((_, reject) => {
          rejectCredentials = reject;
        }),
    );
    const setProcessor = vi.fn(() => Promise.resolve(withProcessor("B")));
    const services = fakeEngineServices({
      ocr: { ocrSettings: () => Promise.resolve(BASE), storeCredentials, setProcessor },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider initialLocale="es">
        <EngineServicesContext.Provider value={services}>{children}</EngineServicesContext.Provider>
      </I18nProvider>
    );
    const { result } = renderHook(() => useOcrSettings(vi.fn()), { wrapper });
    await act(() => Promise.resolve());

    act(() => {
      result.current.storeCredentials("{}");
    });
    await act(async () => {
      result.current.setProcessor({ projectId: "p", location: "us", processorId: "B" });
      await Promise.resolve();
    });
    await act(async () => {
      rejectCredentials(new Error("sin respuesta"));
      await Promise.resolve();
    });

    expect(result.current.problem).toBe("failed");
  });

  it("(regresión) un fallo viejo del mismo ajuste no se muestra si un guardado más nuevo ya funcionó", async () => {
    const settle: { resolve: (r: OcrSettingsResult) => void; reject: (e: Error) => void }[] = [];
    const setProcessor = vi.fn(
      () =>
        new Promise<OcrSettingsResult>((resolve, reject) => {
          settle.push({ resolve, reject });
        }),
    );
    const services = fakeEngineServices({
      ocr: { ocrSettings: () => Promise.resolve(BASE), setProcessor },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider initialLocale="es">
        <EngineServicesContext.Provider value={services}>{children}</EngineServicesContext.Provider>
      </I18nProvider>
    );
    const { result } = renderHook(() => useOcrSettings(vi.fn()), { wrapper });
    await act(() => Promise.resolve());

    act(() => {
      result.current.setProcessor({ projectId: "p", location: "us", processorId: "A" });
    });
    act(() => {
      result.current.setProcessor({ projectId: "p", location: "us", processorId: "B" });
    });
    await act(async () => {
      settle[1]?.resolve(withProcessor("B"));
      await Promise.resolve();
    });
    await act(async () => {
      settle[0]?.reject(new Error("sin respuesta"));
      await Promise.resolve();
    });

    expect(result.current.problem).toBeNull();
    expect(result.current.state).toEqual({ status: "ready", data: withProcessor("B") });
  });
});
