import { env } from "@/config/env";

function joinWebPath(path: string): string | null {
  if (!env.micboxxWebBaseUrl) return null;
  return `${env.micboxxWebBaseUrl.replace(/\/$/, "")}${path}`;
}

export function getSupportUrl(): string | null {
  return joinWebPath("/contact");
}

export function getHelpCenterUrl(): string | null {
  return joinWebPath("/help");
}

export function getPrivacyUrl(): string {
  return "https://www.micboxx.com/privacy";
}

export function getTermsUrl(): string {
  return "https://www.micboxx.com/terms";
}
