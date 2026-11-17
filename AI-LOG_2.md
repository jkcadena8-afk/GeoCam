# Registro de Auditoria de IA (AI-LOG) - Semana 9

**Estudiante(s):** _completar_
**Proyecto:** GeoCam sincronizada - Taller Integrador 2

Sincronizacion en dos sentidos entre SQLite y Supabase con TanStack Query (T1 a T7 de la guia).

## 1. Prompts utilizados

1. "Actua como un desarrollador experto en React Native con Expo SDK 57, TypeScript, Drizzle ORM y Supabase. Ayudame a revisar y validar la estructura base para la app GeoCam [...] Configura el cliente de Supabase (lib/supabase.ts) usando las variables de entorno EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, asegurando que expo-secure-store maneje la persistencia de sesion de forma segura."
2. "Genera el esquema de la base de datos SQLite con Drizzle ORM (db/schema.ts) para la aplicacion GeoCam [...] Proporciona la configuracion para inicializar la base de datos SQLite con expo-sqlite y ejecutar las migraciones .sql al iniciar la app."
3. "Crea el componente/pantalla de captura utilizando expo-camera y expo-location [...] Guardar el registro en la base de datos local SQLite mediante Drizzle ORM con synced = false [...]"
4. "Implementa la logica de sincronizacion offline-first en un custom hook (ejemplo: hooks/useSync.ts) o servicio de sincronizacion [...]"

Junto con los prompts se entrego la Guia de la Semana 9, que se tomo como especificacion cuando ambos diferian.

## 2. Codigo generado vs. codigo modificado

**Generado con Claude Code:** `services/sync.ts`, `hooks/useSync.ts`, `lib/queryClient.ts`, `context/AuthContext.tsx`, `app/login.tsx`, `components/SyncIndicator.tsx`, `db/repositories/syncMeta.ts`, `supabase/semana9.sql` y los cambios en esquema, repositorios y hooks. La migracion `drizzle/0002_sincronizacion.sql` la genero `drizzle-kit generate`.

**Diferencias frente a los prompts (decisiones tomadas):**

| Prompt | Se implemento | Motivo |
|--------|---------------|--------|
| Expo SDK 57 | SDK 58 | Expo Go de las tiendas ya solo abre SDK 58 |
| `synced` booleano | `syncedAt` + `updatedAt` | Con un booleano se pierde una edicion hecha durante la subida (guia) |
| Tabla `captures`, bucket `geocam-photos` | Tabla `photos`, bucket `geocam` | Nombres de la guia |
| NativeWind | StyleSheet | La guia no lo pide; se decidio no reescribir las pantallas |

**Cambios propios de la IA sobre el codigo de apoyo de la guia:**

- Los ciclos de `syncAll` se encadenan: `invalidateQueries` reinicia la consulta sin detener la anterior y dos ciclos podian competir por las mismas filas.
- La lectura del archivo usa `new File(uri).arrayBuffer()` en lugar de `fetch(uri)`.
- `useSync` usa `skipToken` en lugar de `userId!`, y se monta en `(tabs)/_layout.tsx` para que corra aunque no se abra la pestana Fotos.
- SecureStore admite unos 2048 bytes por llave: la sesion se guarda en trozos.
- `client_id` es `text` en Postgres para que el valor comparado sea exactamente el que genero el telefono.

**Modificado a mano por el/la estudiante:** _completar; escribir "nada" si no hubo cambios._

## 3. Alucinaciones o errores detectados

- **Decision equivocada de una sesion anterior:** se habia reemplazado SQLite por Supabase directo. La guia exige SQLite como fuente de verdad, asi que se restauro la capa local.
- **SDK 58 rompio tipos existentes:** `useColorScheme` ya no devuelve `'unspecified'`, `Text['props']` ya no existe y las props de `react-native-webview` colapsan a `never` con RN 0.88 (lo detecto `tsc`).
- **`npm install` fallo con `ERESOLVE`** al actualizar sobre el arbol de SDK 57; se resolvio con una instalacion limpia, sin `--force` ni `--legacy-peer-deps`.

## 4. Verificacion

Ver la tabla "Estado de las pruebas" en el README. Las pruebas T7 requieren dos telefonos y no las pudo ejecutar la IA.

## 5. Limites conocidos

- Los borrados no se sincronizan (trabajo para la casa, C1).
- Los albumes son solo locales.
- Las fotos locales no guardan propietario: si otra cuenta inicia sesion en el mismo telefono, las pendientes se suben a esa cuenta.
