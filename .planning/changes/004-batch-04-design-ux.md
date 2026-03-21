# Batch 004 — 10 Design & UX Improvements

**Date:** 2026-03-21
**Status:** Deployed

## What was improved

### MEJORA 1 — Feedback toasts para acciones clave
- `hooks/useUserTrips.ts`: `createTrip` y `renameTrip` reciben `locale` opcional y muestran `toast.success` al completarse. Agregado `duplicateTripWithLocale` como variante locale-aware.
- `components/TripPanel.tsx`: `handleImportFlights` muestra toast con el numero de vuelos importados.
- `app/app/page.tsx`: `saveDraftTrip` muestra toast al guardar. Todas las llamadas usan versiones locale-aware.

### MEJORA 2 — Trip cards mas ricas en TripListView
- `components/TripListView.tsx`: Funciones `buildRouteLabel` (ruta resumida: `EZE -> MIA -> +2 mas`) y `getNextFlightLabel` (fecha/hora del proximo vuelo, rojo si es hoy). Eliminado bloque daysUntil anterior.

### MEJORA 3 — Connection risk como separador entre vuelos
- `components/TripPanel.tsx`: Flight cards renderizan con `Fragment`, separador visual entre ellos con icono + texto + aeropuerto/MCT.
- `components/FlightCard.tsx`: Removido `ConnectionRiskBanner` del interior del card.

### MEJORA 4 — Draft banner violet sticky con CTA claro
- `components/TripPanel.tsx`: Banner rediseñado de amarillo a violeta, sticky, con contador de vuelos y boton "Guardar viaje" con icono `Save`.

### MEJORA 5 — AI Explain button rediseñado
- `components/AirportCard.tsx`: Boton con `Sparkles + "Explicar con IA"`, estilo violeta bordeado. Loading: "Analizando..." con animate-pulse. Resultado con bg-violet-950/20.

### MEJORA 6 — Indicador de stale data en Airport cards
- `components/AirportCard.tsx`: Antigüedad mostrada si > 10 minutos. Naranja si > 25 minutos. Importado `Clock`.

### MEJORA 7 — Tab bar con scroll arrows (desktop)
- `components/TripTabBar.tsx`: `scrollRef`, estados `canScrollLeft`/`canScrollRight`, `ResizeObserver`. Botones con degradado aparecen al haber overflow. Importados `ChevronLeft`, `ChevronRight`. Importado `useEffect`.

### MEJORA 8 — Mobile trip picker con animacion
- `components/BottomNav.tsx`: Popup siempre en DOM con transicion CSS. Backdrop con transicion. `ChevronUp` con rotacion 180deg. Haptic via `navigator.vibrate?.(10)`.

### MEJORA 9 — Empty state con steps y CTA
- `components/TripPanel.tsx`: Estado vacio con icono `PlaneTakeoff` en caja azul, descripcion, 3 micro-pasos, boton "Agregar primer vuelo".

### MEJORA 10 — Microcopy en airport search
- `components/AirportSearch.tsx`: Parrafo de microcopy encima del boton cuando no hay aeropuertos monitoreados.

## Files changed

| File | Change |
|------|--------|
| `hooks/useUserTrips.ts` | Toasts en createTrip, renameTrip, nuevo duplicateTripWithLocale |
| `app/app/page.tsx` | Toast en saveDraftTrip, locale-aware rename/duplicate |
| `components/TripPanel.tsx` | Draft banner violet, connection separators, empty state CTA, import toast |
| `components/TripListView.tsx` | Route label, next flight with time, removed getDaysUntil |
| `components/FlightCard.tsx` | Removed ConnectionRiskBanner from inside card |
| `components/AirportCard.tsx` | AI explain redesign, stale data indicator, Clock import |
| `components/AirportSearch.tsx` | Microcopy when no airports watched |
| `components/TripTabBar.tsx` | Scroll overflow arrows with ResizeObserver |
| `components/BottomNav.tsx` | Picker animation, ChevronUp indicator, haptic feedback |

## Que vigilar

- `duplicateTripWithLocale` duplica logica de `duplicateTrip`. Si se agrega logica en uno, hacerlo en el otro (o refactorizar en un unico metodo con parametro opcional).
- La transicion del BottomNav picker requiere que el bloque siempre este montado — no usar `{showTripPicker && ...}` en ese bloque.
- El `ResizeObserver` en TripTabBar puede dispararse frecuentemente en resize; es OK ya que solo actualiza estado booleano.
- `navigator.vibrate` no disponible en iOS — el operador `?.` lo hace seguro.
