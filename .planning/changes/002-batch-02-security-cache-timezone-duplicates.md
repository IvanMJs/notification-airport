# Fix 002 — Security, Cache Isolation, Timezone Risk & Duplicate Detection (Batch 2)

**Date:** 2026-03-21
**Commit:** 5adab7a
**Status:** ✅ Deployed

## What was broken

1. **duplicateTrip corrupto** — Si cualquier insert de vuelo o alojamiento fallaba a mitad del proceso, el viaje duplicado quedaba incompleto en la DB sin avisar al usuario.

2. **Cache de trip advice sin aislamiento de usuario** — El cache de consejos de viaje usaba solo la firma del itinerario como clave. Dos usuarios con los mismos vuelos en el mismo browser compartían el mismo cache. Privacy issue.

3. **Trip advice JSON sin validación** — El JSON devuelto por Claude se casteaba directo a `TripAdviceResult` sin verificar el schema. Campos faltantes o con tipo incorrecto podían crashear el frontend.

4. **Push subscriptions sin aislamiento** — Si el usuario A tenía un endpoint push y el usuario B iniciaba sesión en el mismo dispositivo, el upsert con `onConflict: "endpoint"` actualizaba el user_id sin limpiar el estado anterior correctamente.

5. **Connection risk ignoraba zonas horarias** — `parseToMinutes` calculaba buffers de conexión usando la hora local del browser. Para conexiones internacionales (ej: EZE→MIA→JFK), el buffer calculado podía estar hasta 3 horas off respecto a la realidad UTC.

6. **Vuelos duplicados en import** — Al importar el mismo itinerario dos veces, los vuelos se agregaban sin verificar si ya existían en el viaje.

## What was changed

| File | Change |
|------|--------|
| `hooks/useUserTrips.ts` | duplicateTrip: rollback con delete completo si cualquier insert falla |
| `hooks/useTripAdvice.ts` | Carga userId desde Supabase auth, lo incluye en la firma del cache |
| `lib/tripAdviceCache.ts` | `computeTripSignature` acepta `userId` opcional como prefijo |
| `app/api/trip-advice/route.ts` | Zod schema completo para `TripAdviceResult` — valida summary, packing items, destination_tips, by_leg |
| `app/api/push/subscribe/route.ts` | Verifica si el endpoint existe con otro user_id antes de upsert; lo elimina si es de otro usuario |
| `lib/connectionRisk.ts` | `localToUTCMinutes` con Intl.DateTimeFormat + datos de timezone de AIRPORTS; reemplaza `parseToMinutes` |
| `app/app/page.tsx` | Duplicate detection en `onAddFlight` — compara flightCode + isoDate antes de llamar a addFlightDB |

## Why this fix works

**duplicateTrip**: `rollbackTrip()` elimina el trip recién creado en Supabase si cualquier insert hijo falla, garantizando atomicidad en el cliente.

**Cache isolation**: userId se obtiene del Supabase client al montar el hook. El fetch no corre hasta que userId está disponible (usando `if (userId === undefined) return` en el useEffect). Esto garantiza que el primer fetch usa la clave correcta.

**Timezone**: `localToUTCMinutes` usa Intl.DateTimeFormat para encontrar la diferencia entre "tratar la hora como UTC" vs "lo que esa hora UTC aparece en el timezone del aeropuerto". La diferencia es el UTC offset, y se suma para obtener el UTC correcto.

**Push security**: Si el endpoint pertenece a otro usuario, se elimina primero con `delete()`. Esto maneja el caso real de "mismo dispositivo, distinta cuenta" sin afectar el caso normal (mismo usuario renovando subscription).

## What to watch for

- La carga de userId en useTripAdvice agrega una llamada a Supabase auth en cada mount. Es ligera (cached en el cliente de Supabase) pero si TripPanel se monta frecuentemente, monitorear calls.
- `localToUTCMinutes` puede fallar con Intl para timezones no estándar (ej: "UTC+5:30"). El fallback lo trata como UTC, que es el comportamiento original.
- El duplicate detection bloquea TODOS los vuelos con mismo código+fecha, incluso si son tramos distintos del mismo vuelo (raro pero posible en codeshares).

## Agent infrastructure changes

- 7 agentes actualizados con `permissionMode: bypassPermissions` — operan sin pedir confirmación
- Nuevo agente `changelog` — documenta cambios en `.planning/changes/` después de cada batch
- `CLAUDE.md` actualizado con flujos E2E y reglas de operación autónoma
