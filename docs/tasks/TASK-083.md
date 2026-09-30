# TASK-083 — L'app su Expo: aperta da Expo Go senza Expo acceso sul PC

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-083-eas-update` · **ADR**: ADR-0078

## Obiettivo

L'app è pubblicata su Expo con EAS Update e si apre dall'iPhone in Expo Go
senza `npm run mobile` acceso sul PC. L'app usa l'indirizzo dell'API
scritto al momento della pubblicazione (`EXPO_PUBLIC_API_URL`, TASK-081).

Attenzione al titolo: **senza Expo acceso**, non senza PC. Per calcolare un
percorso serve sempre l'API da qualche parte: il PC con Tailscale (strada A
di `DEPLOY.md`) o un server (strade B–E). Cambia solo che non serve più il
server di sviluppo di Expo (porta 8081) né il QR del terminale.

## Contesto da leggere

- `docs/PASSAGGIO.md`, riga TASK-083.
- `docs/DEPLOY.md` §A.5 (indirizzo e chiave scritti nell'app).
- `apps/mobile/src/api/apiUrl.ts`: senza `EXPO_PUBLIC_API_URL` l'app
  ricava l'API dall'host di Expo (`hostUri`), che in un update pubblicato
  non è il PC.
- Documentazione Expo: un update si apre in Expo Go solo con
  `runtimeVersion` nella forma `exposdk:<versione dell'SDK>` e con
  `expo-updates` installato (`eas update` lo richiede). Su iOS Expo Go apre
  solo progetti dell'account con cui si è entrati in Expo Go.

## Cosa fare

1. **Dipendenza** `expo-updates` (versione dell'SDK 57, `npx expo install`):
   nuova, va chiesta prima (`CLAUDE.md`, `PASSAGGIO.md`).
2. **Login a Expo**: lo fa l'utente (`npx eas-cli login`), con il suo
   account; poi `npx eas-cli init` crea il progetto su expo.dev e scrive
   `extra.eas.projectId` (e `owner`) in `app.json`. L'agente non inserisce
   credenziali.
3. `app.json`: `runtimeVersion` = `exposdk:57.0.0`, `updates.url` =
   `https://u.expo.dev/<projectId>`.
4. `apiUrl.ts`: se l'app non gira dal server di sviluppo e manca
   `EXPO_PUBLIC_API_URL`, nessun indirizzo indovinato, con test.
   (Da verificare: forse `hostUri` in un update è già vuoto e basta un test.)
5. Pubblicare: da `apps/mobile`, con `EXPO_PUBLIC_API_URL` in
   `apps/mobile/.env`, `npx eas-cli update --branch preview --environment
   preview --message "..."`.
   Aprire l'update in Expo Go dall'iPhone (QR della pagina dell'update su
   expo.dev, o la scheda del progetto in Expo Go) e chiedere un percorso.
6. `docs/DEPLOY.md`: sezione nuova «L'app senza Expo acceso» (login,
   pubblicare, aprire, cosa rifare dopo una modifica dell'app, limiti).
7. ADR-0078, righe in `STATUS.md`.

## Criteri di accettazione

- [x] `expo-updates` installato alla versione dell'SDK 57, con l'ok
      dell'utente; `npm run typecheck`, `lint`, `format:check`, `test`
      verdi.
- [x] `app.json` con `runtimeVersion` `exposdk:57.0.0`, `updates.url` e
      `projectId`; nessun segreto nel repository.
- [x] Senza `EXPO_PUBLIC_API_URL` e senza server di sviluppo l'app non
      indovina un indirizzo sbagliato (test in `apiUrl.test.ts`).
- [x] Un update pubblicato con `eas update` si apre in Expo Go sull'iPhone
      con `npm run mobile` spento, e calcola un percorso (prova dell'utente).
- [x] `DEPLOY.md` spiega pubblicare, aprire e ripubblicare; ADR-0078 in
      `DECISIONS.md`; righe in `STATUS.md`.
- [x] PR con CI verde.

## File toccati

```
docs/tasks/TASK-083.md                     (nuovo)
apps/mobile/app.json
apps/mobile/package.json                   (solo expo-updates)
package-lock.json                          (solo expo-updates)
apps/mobile/src/api/apiUrl.ts, apiUrl.test.ts
docs/DEPLOY.md
docs/STATUS.md, docs/DECISIONS.md          (solo righe nuove)
```

Non tocca i file di TASK-080 (`App.tsx`, `src/route/`, `shared-types`,
`services/`) né quelli di TASK-079 (contorno dell'immagine).

## Fuori scope

- Build propria (`eas build`, TestFlight): serve l'account Apple Developer.
- Pubblicare dalla CI a ogni merge (servirebbe `EXPO_TOKEN` fra i segreti
  di GitHub): proposta per un task a parte, se l'utente la vuole.
- Spostare l'API su un server: strade B–E di `DEPLOY.md`.
- Android: Expo Go su Android ha un problema noto nel caricare gli update
  dell'SDK 57 (expo/expo#50139); si prova solo l'iPhone.

## Esito

Fatto. L'app è su Expo (`@lppl1316/shaperoute`, branch `preview`) e si
apre in Expo Go sull'iPhone senza `npm run mobile`: provata dall'utente il
2026-09-28, con l'API sul Mac via Tailscale (`100.84.99.112:8000`,
salvato come variabile dell'ambiente `preview` su EAS, su richiesta
dell'utente; non nel repository). Un'app pubblicata non ricava più l'API
dall'host di Expo. Proposta per dopo, non fatta: pubblicare dalla CI a ogni
merge (`EXPO_TOKEN`).
