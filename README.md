# ✈ Airport Monitor

Monitor de estado de aeropuertos USA en tiempo real usando la FAA ASWS API + notificaciones WhatsApp cada 12hs via n8n.

**Viaje:** EZE → MIA → GCM → JFK → MIA → EZE (29 Mar – 12 Abr 2026)

---

## Inicio rápido

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

---

## Parte 1 — App Web (Next.js)

### Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- FAA ASWS API (gratuita, sin API key)
- Auto-refresh configurable (5/10/15/30 min)
- Persistencia en localStorage

### Cómo funciona
La FAA API devuelve XML con **solo los aeropuertos que tienen problemas activos**.
Si un aeropuerto no aparece en la respuesta = todo normal.

El fetch se hace server-side (`/api/faa-status`) para evitar CORS.

### Aeropuertos por defecto
`MIA · JFK · EWR · EZE` — editables desde la UI, guardados en localStorage.

---

## Parte 2 — Workflow n8n + WhatsApp

### Prerequisitos

#### 1. Cuenta Meta Developer

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. **Create App** → tipo **Business**
3. **Add Product** → **WhatsApp**

#### 2. Obtener credenciales

En **WhatsApp > Getting Started**:

| Campo | Descripción |
|-------|-------------|
| Phone Number ID | ID del número de envío (para la URL) |
| Temporary Access Token | Token válido 24hs (para testing) |
| Recipient number | Tu número personal en formato `+54911XXXXXXXX` |

```
# Agregar tu número como destinatario de prueba:
WhatsApp > Getting Started > "To" → agregar +54911XXXXXXXX
```

#### 3. Token permanente (para producción)

1. **Business Settings** → **System Users** → crear usuario de sistema
2. Asignar permiso `whatsapp_business_messaging`
3. Generar token → copiar y guardar

#### 4. Verificar número propio (producción)

1. **WhatsApp > Phone Numbers** → agregar número
2. Verificar via SMS/llamada
3. Proceso toma 1-2 días hábiles

---

### Setup n8n

#### Variables de entorno

En n8n: **Settings > n8n > Variables**

```
WHATSAPP_PHONE_NUMBER_ID   = 123456789012345
WHATSAPP_ACCESS_TOKEN      = EAAxxxxxxxxxxxxxx
WHATSAPP_RECIPIENT_NUMBER  = 5491112345678   (sin el +)
```

#### Credencial HTTP Header Auth

En n8n: **Credentials > New > Header Auth**

```
Name:  Authorization
Value: Bearer TU_ACCESS_TOKEN_AQUI
```

Nombrar la credencial: `WhatsApp Meta API`

#### Importar workflow

1. En n8n: **Workflows > Import from file**
2. Seleccionar `n8n-airport-monitor-workflow.json`
3. Asignar la credencial `WhatsApp Meta API` a los nodos HTTP de WhatsApp
4. **Activate** el workflow

#### Testear manualmente

Clic en **Execute Workflow** → verificar que llega el mensaje.

---

### Formato del mensaje WhatsApp

```
✈️ Airport Monitor — 16/03 08:00 (ARG)

⚠️ 2 aeropuerto(s) con problemas:

🔴 EWR
   Demora: 46-60 min
   Causa: WEATHER / LOW CEILINGS
   Tendencia: Increasing

🛑 JFK
   🛑 Ground Stop hasta 09:00
   Causa: WEATHER

✅ OK: MIA · EZE · GCM

─────────────────
🗓️ Mis vuelos:

🟢 29 Mar · AA 900
   EZE → MIA · Sale 20:30

🟢 31 Mar · AA 956
   MIA → GCM · Sale 12:55

_Fuente: FAA · próxima actualización en 12hs_
```

### Lógica condicional

El nodo **"¿Hay problemas?"** bifurca el flow:
- `true` → manda mensaje completo con detalle de problemas
- `false` → manda mensaje corto de confirmación "Todo OK"

Para **silencio total** cuando todo está bien: conectar el nodo IF `false` a un nodo **NoOp** (sin operación) en lugar del HTTP Request.

---

## Deploy

### Vercel (recomendado)

```bash
npm run build      # verificar que compila
vercel --prod
```

### Local

```bash
npm run dev        # http://localhost:3000
```

---

## Estructura del proyecto

```
/app
  page.tsx                  Dashboard principal
  layout.tsx                Layout dark mode
  /api/faa-status/route.ts  Proxy server-side a FAA
/components
  AirportCard.tsx           Card individual por aeropuerto
  AirportSearch.tsx         Buscador para agregar aeropuertos
  StatusBadge.tsx           Badge coloreado por severidad
  GlobalStatusBar.tsx       Barra resumen en el header
  RefreshCountdown.tsx      Countdown + progress bar
  MyFlightsPanel.tsx        Panel con mis vuelos
/hooks
  useAirportStatus.ts       Polling automático con detección de cambios
/lib
  faa.ts                    Fetch + parseo XML
  airports.ts               Lista 30 aeropuertos USA
  types.ts                  TypeScript interfaces
  utils.ts                  cn() helper
n8n-airport-monitor-workflow.json   Workflow n8n listo para importar
```

---

## Sistema de colores

| Estado | Color | Descripción |
|--------|-------|-------------|
| ✅ Normal | Verde | Sin demoras |
| 🟡 Demora leve | Amarillo | ≤15 min |
| 🟠 Demora moderada | Naranja | 16–45 min |
| 🔴 Demora severa | Rojo | >45 min |
| 🔴 Ground Delay | Rojo oscuro | Programa de demora en tierra |
| 🛑 Ground Stop | Rojo pulsante | Stop completo activo |
| ⛔ Cerrado | Gris | Aeropuerto cerrado |

---

## Fuente de datos

**FAA ASWS API** — Completamente gratuita, sin API key, datos oficiales del gobierno de USA.

- URL: `https://nasstatus.faa.gov/api/airport-status-information`
- Formato: XML
- Actualización: cada ~5 minutos en la fuente
- Solo muestra aeropuertos **con problemas activos** — si no aparece = todo OK
