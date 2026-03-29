const DEFAULT_LOCAL_UPLOAD_MB = 25;
const DEFAULT_VERCEL_UPLOAD_MB = 4;

function parseUploadLimit(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getMaxUploadMb(): number {
  return (
    parseUploadLimit(process.env.UPLOAD_MAX_MB) ??
    parseUploadLimit(process.env.NEXT_PUBLIC_UPLOAD_MAX_MB) ??
    (process.env.VERCEL ? DEFAULT_VERCEL_UPLOAD_MB : DEFAULT_LOCAL_UPLOAD_MB)
  );
}

export function getMaxUploadBytes(): number {
  return getMaxUploadMb() * 1024 * 1024;
}
