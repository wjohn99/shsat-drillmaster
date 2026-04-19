import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves `/public` asset paths for Vite `base` (e.g. `/shsat-drillmaster/` on GitHub Pages).
 * Leaves absolute `http(s):` URLs and paths already under `BASE_URL` (e.g. Vite `?url` imports) unchanged.
 */
export function publicUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (normalizedBase !== "" && path.startsWith(`${normalizedBase}/`)) {
    return path;
  }
  const trimmed = path.replace(/^\/+/, "");
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${trimmed}`;
}
