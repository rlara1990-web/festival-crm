// Utilidades del repositorio de documentos.

/** Ruta en Storage: carpeta del festival (o "general"), id único y nombre saneado. */
export function rutaDocumento(nombre: string, festivalId: string | null): string {
  const limpio = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  return `${festivalId ?? 'general'}/${crypto.randomUUID()}-${limpio}`;
}

export function tamanoTexto(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Límite de Supabase (plan gratuito): 50 MB por archivo */
export const MAX_BYTES = 50 * 1024 * 1024;
