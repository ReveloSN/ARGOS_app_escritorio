import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveTheme } from "./resolveTheme";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./themeContext";

function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <button
      type="button"
      onClick={() => {
        setPreference("dark");
      }}
    >
      {preference}
    </button>
  );
}

function mockSystemPrefersDark(isDark: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: isDark,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe("resolveTheme", () => {
  it.each([
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["system", true, "dark"],
    ["system", false, "light"],
  ] as const)("%s con sistema oscuro=%s da %s", (preference, systemIsDark, expected) => {
    expect(resolveTheme(preference, systemIsDark)).toBe(expected);
  });
});

describe("ThemeProvider", () => {
  it("aplica el tema del sistema al documento por defecto", () => {
    mockSystemPrefersDark(true);

    render(<ThemeProvider>{null}</ThemeProvider>);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("cambia el tema cuando el usuario elige otro", async () => {
    mockSystemPrefersDark(false);
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await act(() => userEvent.click(screen.getByRole("button")));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button")).toHaveTextContent("dark");
  });
});
