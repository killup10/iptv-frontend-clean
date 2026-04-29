import { storage } from "./storage.js";

function buildDeviceFingerprint() {
  const navigatorInfo = typeof navigator !== "undefined" ? navigator : {};
  const screenInfo = typeof window !== "undefined" ? window.screen : null;

  return JSON.stringify({
    userAgent: navigatorInfo.userAgent || "unknown",
    language: navigatorInfo.language || "unknown",
    platform: navigatorInfo.platform || "unknown",
    screenResolution: `${screenInfo?.width || 0}x${screenInfo?.height || 0}`,
  });
}

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    hash = ((hash << 5) - hash) + charCode;
    hash |= 0;
  }

  return hash;
}

export function generateStableDeviceId() {
  return `device_${Math.abs(hashString(buildDeviceFingerprint()))}`;
}

export async function getOrCreateDeviceId() {
  const storedDeviceId = await storage.getItem("deviceId");
  if (storedDeviceId && storedDeviceId.trim()) {
    return storedDeviceId;
  }

  const nextDeviceId = generateStableDeviceId();
  await storage.setItem("deviceId", nextDeviceId);
  return nextDeviceId;
}
