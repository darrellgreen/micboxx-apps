const AVATAR_PALETTES = ["#0f172a", "#1f2937", "#0b3d2a", "#2a1f3d"] as const;

export const getInitials = (displayName: string | null, username: string | null): string => {
  const source = (displayName?.trim() ?? username?.trim() ?? "").trim();
  if (!source) return "MB";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
};

export const getAvatarBackground = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length] ?? AVATAR_PALETTES[0]!;
};
