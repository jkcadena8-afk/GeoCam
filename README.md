# GeoCam

> **Versión anterior.** Este proyecto es la GeoCam de la Semana 9 (SQLite + sincronización con Supabase, Expo SDK 58).
> La versión actual, con el asistente IA de la Semana 10, es [geocam-ve](https://github.com/jkcadena8-afk/geocam-ve).
> Su sincronización usa columnas (`uri`, `accuracy`) que ya no existen en el esquema actual de Supabase.


App en Expo (SDK 58) que toma fotos con la cámara, guarda su ubicación GPS y las muestra en un mapa
de OpenStreetMap. Es **offline-first**: siempre lee y escribe en **SQLite** (Drizzle) y se
sincroniza en dos sentidos con **Supabase** cuando hay red.

## Cómo ejecutarlo

1. En el **SQL Editor** de Supabase ejecuta `supabase/schema.sql` y después `supabase/semana9.sql`.
2. Copia `.env.example` a `.env.local` y pon la URL y la publishable key.
3. Arranca la app:

       npm install
       npx expo start -c

Se abre con **Expo Go para SDK 58**. El teléfono y la PC deben estar en la misma red.

## Arquitectura (por capas)

    Pantalla (app/) -> Hook (hooks/) -> Repositorio (db/repositories/) -> Drizzle -> SQLite
                                     -> Servicio (services/sync.ts) -> Supabase

Las pantallas no importan Supabase ni Drizzle: solo usan hooks.

| Capa | Archivos |
|------|----------|
| Pantallas | `app/login.tsx`, `app/(tabs)/geocam.tsx`, `fotos.tsx`, `mapa.tsx`, `app/foto/[id].tsx` |
| Hooks | `usePhotos`, `usePhotoList`, `usePhotoDetail`, `useAlbums`, `useSync`, `useCamera`, `useGeoLocation`, `useShake` |
| Repositorios | `db/repositories/photos.ts`, `albums.ts`, `syncMeta.ts` |
| Esquema local | `db/schema.ts`, `db/client.ts`, `drizzle/` |
| Sincronización | `services/sync.ts`, `services/photoFiles.ts` |
| Infraestructura | `lib/supabase.ts`, `lib/queryClient.ts`, `context/AuthContext.tsx` |
| Esquema remoto | `supabase/schema.sql`, `supabase/semana9.sql` |

## Sincronización

**SQLite es la fuente de verdad.** Una foto está pendiente si `syncedAt` está vacío o es
anterior a `updatedAt`. Cada foto tiene un `clientId` (UUID creado en el teléfono), porque el
`id` autoincremental solo vale dentro de un dispositivo.

    Abrir la app / volver la red / primer plano / cambio local
                          |
                    TanStack Query (useSync)
                          |
              1. BAJAR: filas con server_updated_at > cursor
                 no existe -> descarga archivo y crea la fila
                 remota más nueva -> se aplica
                 local más nueva -> no se toca
                          |
              2. SUBIR: archivo si falta, upsert por client_id
                 syncedAt = el updatedAt que se subió

Se baja primero para comparar antes de escribir: si se subiera primero, un cambio local viejo
podría pisar uno remoto más nuevo.

| Columna remota | Quién la escribe | Para qué |
|----------------|------------------|----------|
| `updated_at` | El teléfono, al editar | Decide los conflictos |
| `server_updated_at` | Postgres, con un trigger | Cursor de bajada |

**Regla de conflicto: gana el último cambio** (`remoteWins`, función pura). Ejemplo: A edita la
nota a las 10:00 y B a las 10:01, ambos sin conexión. Al reconectar queda la nota de B en los
dos, y la edición de A se pierde. Es aceptable para notas personales.

**Límites:** los borrados no se sincronizan todavía, los álbumes son solo locales y el resultado
depende de que la hora de los teléfonos sea razonable.

## Estado de las pruebas

Las pruebas con teléfono quedan **por ejecutar**. Anota aquí el resultado real.

| Prueba | Resultado esperado | Resultado obtenido |
|--------|--------------------|--------------------|
| Sin conexión: modo avión, dos fotos, editar una nota, reconectar | Se suben solas y el indicador pasa a "Al día" | _pendiente_ |
| Dos teléfonos con la misma cuenta | Las fotos de A aparecen en B con imagen y ubicación | _pendiente_ |
| Conflicto: editar en A y un minuto después en B, sin conexión | En los dos queda la nota de B | _pendiente_ |

## Modelo de datos local

    albums                          photos
    ------                          ------
    id (PK)                         id (PK), client_id (UNIQUE)
    name (UNIQUE)                   uri, latitude, longitude, accuracy
    created_at                      source ('camera' | 'gallery')
          ^                         album_id (FK -> albums.id, ON DELETE SET NULL)
          |  0..N                   note, favorite
          +-------------------------created_at, updated_at
                                    remote_path, synced_at
    sync_meta: key (PK), value      (cursor de bajada por usuario)

## Permisos

La app nunca pide permisos al abrirse. La cámara es obligatoria (`PermissionPrimer`); la
ubicación es opcional: si se niega, las fotos se guardan sin coordenadas. Con el permiso
bloqueado aparece el botón **Abrir Ajustes**.

## Evidencia

![Pantalla GeoCam](Evidencia/geocam.png)
![Pantalla Mapa](Evidencia/mapa.png)
