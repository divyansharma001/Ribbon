import type { BrowserContext } from "@playwright/test";

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
