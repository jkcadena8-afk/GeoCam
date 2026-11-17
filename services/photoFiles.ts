import { Directory, File, Paths } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

/**
 * Archivos permanentes de las fotos.
 *
 * `takePictureAsync` e `ImagePicker` devuelven URIs en la carpeta de CACHE, que
 * el sistema puede vaciar. Aqui se copian a la carpeta de documentos (segura)
 * y es esa ruta la que se guarda en SQLite. La copia en la nube la sube y la
 * baja services/sync.ts.
 *
 * Se usa solo la API nueva (File / Directory / Paths); no se mezcla
 * con `FileSystem.copyAsync` de la API anterior.
 */
const photosDir = new Directory(Paths.document, 'photos');
const BUCKET = 'geocam';
const SIGNED_URL_SECONDS = 60 * 10;

function ensureDir(): void {
  if (!photosDir.exists) {
    photosDir.create({ intermediates: true, idempotent: true });
  }
}

export function persistPhoto(cacheUri: string): string {
  ensureDir();
  const source = new File(cacheUri);
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const destination = new File(photosDir, name);
  source.copy(destination);
  return destination.uri;
}

export function deletePhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    // Borrar el archivo nunca debe impedir borrar el registro
    console.warn('[GeoCam] No se pudo borrar el archivo:', e instanceof Error ? e.message : e);
  }
}

export async function uploadPhotoFile(storagePath: string, uri: string): Promise<void> {
  const bytes = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: 'image/jpeg' });
  // "ya existe": un intento anterior subio el archivo pero no alcanzo a guardar la fila
  if (error && !/exists/i.test(error.message)) throw error;
}

export async function downloadPhotoFile(storagePath: string, clientId: string): Promise<string> {
  ensureDir();
  const destination = new File(photosDir, `${clientId}.jpg`);
  if (destination.exists) return destination.uri;

  // El bucket es privado: se descarga con una URL firmada de corta duracion
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  if (error) throw error;

  const file = await File.downloadFileAsync(data.signedUrl, destination);
  return file.uri;
}
