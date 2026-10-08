import { decimal, t } from "../i18n";

/**
 * A size on the phone as people read it: «19 MB», «1.2 GB» (in decimal
 * units, as the 2 GB limit). Something under a megabyte is «1 MB», never
 * «0 MB»; nothing at all is «0 MB».
 */
export function sizeText(bytes: number): string {
  const megabytes = bytes > 0 ? Math.max(1, Math.round(bytes / 1e6)) : 0;
  return megabytes < 1000
    ? t("{size} MB", { size: megabytes })
    : t("{size} GB", { size: decimal(bytes / 1e9) });
}
