import { env } from "@/config/env";

function joinWebPath(path: string): string | null {
  if (!env.micboxxWebBaseUrl) {
    return null;
  }

  return `${env.micboxxWebBaseUrl.replace(/\/$/, "")}${path}`;
}

export function getCreatorSignupUrl(): string | null {
  return joinWebPath("/signup/artist");
}

export function getPasswordResetUrl(): string | null {
  return joinWebPath("/login");
}

export function getCreatorUpgradeUrl(): string | null {
  return joinWebPath("/subscription/artists");
}

export function getSupportUrl(): string | null {
  return joinWebPath("/contact");
}

export function getLegalUrl(): string | null {
  return joinWebPath("/legal");
}
