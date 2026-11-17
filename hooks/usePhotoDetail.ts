import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback } from 'react';

import { photosRepo, type PhotoPatch } from '@/db/repositories/photos';
import { requestSync } from '@/lib/queryClient';
import { deletePhotoFile } from '@/services/photoFiles';

/** Lectura reactiva de UNA foto + acciones de edicion. */
export function usePhotoDetail(id: number | null) {
  // id -1 nunca existe: evita una consulta invalida cuando aun no hay id
  const { data } = useLiveQuery(photosRepo.byIdQuery(id ?? -1), [id]);
  const photo = id === null ? undefined : data[0];

  const update = useCallback(
    async (patch: PhotoPatch) => {
      if (id === null) return;
      await photosRepo.update(id, patch);
      requestSync();
    },
    [id],
  );

  const remove = useCallback(async () => {
    if (id === null) return;
    const current = await photosRepo.findById(id);
    await photosRepo.remove(id);
    if (current) deletePhotoFile(current.uri);
  }, [id]);

  return { photo, update, remove };
}
