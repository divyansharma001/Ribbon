import { DEVICE_COOKIE } from "./device-cookie";
import { deviceLabelFromUserAgent } from "./logic";

export interface Device {
  id: string;
  label: string;
}

const KEY = "ribbon:device";
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

/**
 * This browser's device id and label. Kept in localStorage and mirrored to a
 * cookie, so the server knows which device is asking.
 */
export function getDevice(): Device {
  let device: Device | null = null;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Device | null;
    if (saved?.id && saved.label) device = saved;
  } catch {
    // Storage blocked or corrupt: make a new id below.
  }
  if (!device) {
    device = { id: crypto.randomUUID(), label: deviceLabelFromUserAgent(navigator.userAgent) };
    try {
      localStorage.setItem(KEY, JSON.stringify(device));
    } catch {
      // Private mode: the id lives for this page only.
    }
  }
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // biome-ignore lint/suspicious/noDocumentCookie: a plain first-party cookie; the Cookie Store API is not in every browser yet
  document.cookie = `${DEVICE_COOKIE}=${device.id}; Max-Age=${TWO_YEARS}; Path=/; SameSite=Lax${secure}`;
  return device;
}
