# Fix 001 — Data Integrity & Silent Error Handling (Batch 1)

**Date:** 2026-03-21
**Commit:** 45af3b4
**Status:** ✅ Deployed

## What was broken

1. **Optimistic deletes sin rollback** — `deleteTrip`, `removeFlight`, `removeAccommodation` actualizaban la UI antes de confirmar con Supabase. Si fallaba el delete en la DB, el item desaparecía de la pantalla pero seguía en la base de datos. Al recargar volvía como "fantasma".

2. **Datos AI sin validación** — `app/api/parse-flight` devolvía exactamente lo que Claude generaba sin ningún schema check. Códigos de aeropuerto inválidos, fechas con mes 13, etc. podían insertarse en la DB.

3. **Errores de red silenciosos** — El fetch de estado de aeropuertos internacionales tenía `.catch(() => {})`. Si fallaba, el usuario seguía viendo datos stale sin ningún aviso.

## What was changed

| File | Change |
|------|--------|
| `hooks/useUserTrips.ts` | Snapshot antes de update optimista; restore en error + toast |
| `app/api/parse-flight/route.ts` | Zod schema inline que valida cada vuelo retornado por Claude |
| `app/app/page.tsx` | `.catch(() => {})` → toast.error con mensaje localizado |

## Why this fix works

El pattern rollback usa closures: `const snapshot = trips` captura el estado antes del update, y si Supabase devuelve error se restaura con `setTrips(snapshot)`. Para el AI parsing, Zod usa `.catch("")` en cada campo — datos inválidos se reemplazan con `""` en lugar de pasar a la DB, y el modal de import los marca como faltantes. El toast de intl-status usa `{ id: "intl-status-error" }` para no spamear si el error persiste.

## What to watch for

- Si hay latencia alta en Supabase, el rollback puede verse como "UI bouncing" (item desaparece y vuelve). Es el comportamiento correcto.
- El schema Zod de parse-flight es conservador — si Claude devuelve un formato válido pero no estándar (ej: formato de hora con segundos), el campo se vacía. Monitorear feedback de usuarios sobre parse accuracy.
