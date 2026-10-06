import type { BrowserContext, Page } from "@playwright/test";

/** Pretend this browser context is a given device (id in storage + cookie). */
export async function useDevice(
  context: BrowserContext,
  baseURL: string,
  id: string,
  label: string,
) {
  await context.addInitScript(
    ([deviceId, deviceLabel]) => {
      localStorage.setItem("ribbon:device", JSON.stringify({ id: deviceId, label: deviceLabel }));
    },
    [id, label],
  );
  await context.addCookies([{ name: "ribbon-device", value: id, url: baseURL }]);
}

/**
 * Sets the test reader's layout (book pages or scroll) the way the app saves it:
 * on the account. Every test that cares sets it, so tests never depend on each other.
 */
export async function useMode(page: Page, mode: "book" | "scroll") {
  const res = await page.request.post("/api/settings", { data: { mode } });
  if (!res.ok()) throw new Error(`Couldn't set reading mode: ${res.status()}`);
}
