# TripCopilot — Estado de Publicación

## Completado

### Bloque A — Fixes críticos
- Correcciones de errores críticos para estabilidad de la app

### Bloque B — Descomposición de god components
- Refactorización de componentes monolíticos

### Bloque C — 9 Features premium
- 9 features premium implementados

### Bloque D — Capacitor Native Wrapper
- [x] D1: Capacitor config con server.url apuntando a `https://tripcopilot.app`
- [x] D2: Push notifications nativo (FCM HTTP v1 con OAuth2 automático)
  - Hook `useNativePush` para registro de tokens FCM/APNs
  - API routes: `/api/push/subscribe-native` y `/api/push/unsubscribe-native`
  - Tabla `native_push_tokens` en Supabase (migración aplicada)
  - Firebase service account con JWT signing y cache de tokens
- [x] D3: Deep links (AASA + assetlinks.json) con hook `useDeepLinks`
- [x] D4: Política de privacidad (`/privacy`) y Términos de servicio (`/terms`)
- [x] D7: CI/CD — GitHub Actions workflows para build Android e iOS sin IDEs locales

### Infraestructura
- [x] Firebase proyecto configurado (`tripcopilot-project`)
- [x] `google-services.json` (Android) y `GoogleService-Info.plist` (iOS) listos
- [x] Firebase service account key configurada en Vercel (`FIREBASE_SERVICE_ACCOUNT`)
- [x] Keystore Android generado y convertido a PKCS12 (compatible JDK 21)
- [x] 5 GitHub Secrets configurados para CI/CD Android
- [x] Primer AAB compilado exitosamente en GitHub Actions
- [x] Íconos PWA reemplazados con mascot oficial de TripCopilot
- [x] Cuenta Google Play Console creada

## En Proceso

### Google Play Console
- [ ] Verificación de identidad (documento subido, esperando aprobación)
  - Dirección corregida en perfil de pagos para coincidir con DNI
- [ ] Subir AAB final (después de mergear PR #163 que corrige dominio a tripcopilot.app)
- [ ] Completar ficha de la tienda (descripción, screenshots, categoría)

## Pendiente

### Android — Play Store
- [ ] Mergear PR #163 (fix dominio + íconos PWA)
- [ ] Re-correr workflow Build Android para generar AAB con dominio correcto
- [ ] Tomar 6 screenshots (1080x1920px) de la app para la store listing
- [ ] Subir AAB a Google Play Console (cuando aprueben verificación)
- [ ] Completar store listing (metadata ya preparada en `store-listing/`)
- [ ] Configurar Play Store Service Account para deploy automático (opcional)
- [ ] Reemplazar `FINGERPRINT_PLACEHOLDER` en `public/.well-known/assetlinks.json` con SHA-256 del keystore

### iOS — App Store
- [ ] Crear cuenta Apple Developer ($99/año)
- [ ] Generar certificado de distribución (.p12)
- [ ] Crear provisioning profile
- [ ] Configurar 8 GitHub Secrets para CI/CD iOS
- [ ] Correr workflow Build iOS
- [ ] Subir a TestFlight
- [ ] Completar ficha en App Store Connect
- [ ] Reemplazar `TEAM_ID` en `public/.well-known/apple-app-site-association`

### Seguridad (post-publicación)
- [ ] Rotar Firebase service account key (fue compartida en chat)

## Arquitectura de Build

```
Código (Next.js) → Vercel (deploy web)
                  → GitHub Actions → Capacitor → AAB (Android) → Play Store
                  → GitHub Actions → Capacitor → IPA (iOS) → TestFlight → App Store
```

La app nativa es un WebView que carga `https://tripcopilot.app` — no es un export estático. Esto preserva SSR, API routes y server components.

## Secrets Necesarios

### GitHub Secrets (CI/CD builds)
| Secret | Estado | Descripción |
|--------|--------|-------------|
| GOOGLE_SERVICES_JSON_B64 | ✅ | google-services.json en base64 |
| ANDROID_KEYSTORE_B64 | ✅ | Keystore PKCS12 en base64 |
| ANDROID_KEYSTORE_PASSWORD | ✅ | Password del keystore |
| ANDROID_KEY_ALIAS | ✅ | Alias de la key |
| ANDROID_KEY_PASSWORD | ✅ | Password de la key |
| PLAY_STORE_SERVICE_ACCOUNT_JSON | ❌ | Para deploy automático |
| GOOGLE_SERVICE_INFO_PLIST_B64 | ❌ | GoogleService-Info.plist (iOS) |
| IOS_CERTIFICATE_P12_B64 | ❌ | Certificado Apple (iOS) |
| IOS_CERTIFICATE_PASSWORD | ❌ | Password certificado (iOS) |
| IOS_PROVISIONING_PROFILE_B64 | ❌ | Provisioning profile (iOS) |
| IOS_CODE_SIGN_IDENTITY | ❌ | Identidad de firma (iOS) |
| IOS_PROVISIONING_PROFILE_NAME | ❌ | Nombre del profile (iOS) |
| APPLE_TEAM_ID | ❌ | Team ID de Apple (iOS) |
| APPSTORE_ISSUER_ID | ❌ | App Store Connect API (iOS) |
| APPSTORE_API_KEY_ID | ❌ | App Store Connect API (iOS) |
| APPSTORE_API_PRIVATE_KEY | ❌ | App Store Connect API (iOS) |

### Vercel Env Vars (runtime web)
| Variable | Estado | Descripción |
|----------|--------|-------------|
| FCM_PROJECT_ID | ✅ | `tripcopilot-project` |
| FIREBASE_SERVICE_ACCOUNT | ✅ | JSON del service account |
| ADMIN_EMAILS | ✅ | Emails administradores |
