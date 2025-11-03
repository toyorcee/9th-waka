import Constants from "expo-constants";

const RAW_BASE =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://localhost:3000/api";
const ORIGIN_BASE = RAW_BASE.replace(/\/?api\/?$/i, "").replace(/\/$/, "");

export function toAbsoluteUrl(
  pathOrUrl: string | null | undefined
): string | null {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const base = ORIGIN_BASE;
  if (s.startsWith("/")) return `${base}${s}`;
  return `${base}/${s}`;
}
