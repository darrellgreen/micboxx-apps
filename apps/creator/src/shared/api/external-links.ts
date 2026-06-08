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

export function getHelpCenterUrl(): string | null {
  return joinWebPath("/help");
}

export function getPrivacyUrl(): string {
  return "https://www.micboxx.com/privacy";
}

export function getTermsUrl(): string {
  return "https://www.micboxx.com/terms";
}

export function getPublicProfileUrl(username: string): string | null {
  return joinWebPath(`/artist/${username}`);
}

/** @deprecated Use getPrivacyUrl / getTermsUrl directly */
export function getLegalUrl(): string | null {
  return joinWebPath("/legal");
}
