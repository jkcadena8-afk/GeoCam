import { photosRepo } from '@/db/repositories/photos';
import { syncMetaRepo } from '@/db/repositories/syncMeta';
import { supabase } from '@/lib/supabase';
import { downloadPhotoFile, uploadPhotoFile } from '@/services/photoFiles';

interface RemotePhoto {
  client_id: string;
  storage_path: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  note: string | null;
  favorite: boolean;
  source: 'camera' | 'gallery';
  taken_at: string;
  updated_at: string; // reloj del telefono: decide conflictos
  server_updated_at: string; // reloj del servidor: cursor de bajada
}

const PULL_LIMIT = 200;

/** Gana el ultimo cambio. Con fechas iguales no gana nadie: ya estan sincronizados. */
export function remoteWins(localUpdatedAt: Date | null, remoteUpdatedAt: string): boolean {
  return new Date(remoteUpdatedAt).getTime() > (localUpdatedAt?.getTime() ?? 0);
}

async function pull(userId: string): Promise<number> {
  const cursorKey = `lastPulledAt:${userId}`;
  const since = (await syncMetaRepo.get(cursorKey)) ?? '1970-01-01T00:00:00Z';

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .gt('server_updated_at', since)
    .order('server_updated_at', { ascending: true })
    .limit(PULL_LIMIT)
    .returns<RemotePhoto[]>();
  if (error) throw error;

  let applied = 0;
  for (const remote of data) {
    const local = await photosRepo.findByClientId(remote.client_id);
    const remoteUpdatedAt = new Date(remote.updated_at);

    if (!local) {
      // Foto creada en otro telefono: se descarga el archivo y se crea la fila local
      const uri = await downloadPhotoFile(remote.storage_path, remote.client_id);
      await photosRepo.insertFromRemote({
        clientId: remote.client_id,
        uri,
        latitude: remote.latitude,
        longitude: remote.longitude,
        accuracy: remote.accuracy,
        note: remote.note,
        favorite: remote.favorite,
        source: remote.source,
        createdAt: new Date(remote.taken_at),
        updatedAt: remoteUpdatedAt,
        remotePath: remote.storage_path,
        syncedAt: remoteUpdatedAt, // nace sincronizada
      });
      applied++;
    } else if (remoteWins(local.updatedAt, remote.updated_at)) {
      await photosRepo.applyRemote(local.id, {
        note: remote.note,
        favorite: remote.favorite,
        updatedAt: remoteUpdatedAt,
        syncedAt: remoteUpdatedAt,
      });
      applied++;
    }
    // Si la version local es mas nueva no se toca: push la subira enseguida

    // El cursor avanza fila por fila: si algo falla, el siguiente intento continua desde aqui
    await syncMetaRepo.set(cursorKey, remote.server_updated_at);
  }
  return applied;
}

async function push(userId: string): Promise<number> {
  const pending = await photosRepo.listPending();

  for (const photo of pending) {
    if (!photo.clientId) continue; // ensureSyncFields ya lo relleno
    const path = photo.remotePath ?? `${userId}/${photo.clientId}.jpg`;
    const updatedAt = photo.updatedAt ?? photo.createdAt;

    // 1. El archivo solo se sube la primera vez
    if (!photo.remotePath) await uploadPhotoFile(path, photo.uri);

    // 2. upsert por client_id: crea la fila o la actualiza, nunca la duplica
    const { error } = await supabase.from('photos').upsert(
      {
        client_id: photo.clientId,
        user_id: userId,
        storage_path: path,
        latitude: photo.latitude,
        longitude: photo.longitude,
        accuracy: photo.accuracy,
        note: photo.note,
        favorite: photo.favorite,
        source: photo.source,
        taken_at: photo.createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      },
      { onConflict: 'client_id' },
    );
    if (error) throw error;

    // 3. syncedAt = la version que se subio, no "ahora": una edicion hecha durante
    //    la subida tiene un updatedAt posterior y la foto sigue pendiente
    await photosRepo.markSynced(photo.id, path, updatedAt);
  }
  return pending.length;
}

async function runCycle(userId: string) {
  await photosRepo.ensureSyncFields();
  // Primero bajar: si se subiera primero, un cambio local viejo pisaria uno remoto mas nuevo
  const pulled = await pull(userId);
  const pushed = await push(userId);
  return { pulled, pushed, finishedAt: Date.now() };
}

// invalidateQueries reinicia la consulta aunque la anterior siga corriendo: los
// ciclos se encadenan para que dos nunca compitan por las mismas filas.
let queue: Promise<unknown> = Promise.resolve();

export function syncAll(userId: string) {
  const cycle = queue.then(() => runCycle(userId));
  queue = cycle.catch(() => undefined);
  return cycle;
}
