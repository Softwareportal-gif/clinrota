// Which detail level to show on this device (spec §3.4): data saver stays on
// low, phones and tablets get medium, roomy laptops with memory to spare get
// high, along with the extra lighting effects.
import type { Lod } from "./catalogue";

export type DeviceHints = { saveData?: boolean; deviceMemory?: number; screenWidth: number; screenHeight: number };

export function preferredLod({ saveData, deviceMemory, screenWidth, screenHeight }: DeviceHints): Lod {
  if (saveData) return "low";
  const shortSide = Math.min(screenWidth, screenHeight);
  // Browsers that don't report memory (Safari, Firefox) are judged on screen alone.
  if (shortSide >= 800 && (deviceMemory ?? 8) >= 8) return "high";
  return "medium";
}

export function currentDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return {
    saveData: nav.connection?.saveData,
    deviceMemory: nav.deviceMemory,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
}
