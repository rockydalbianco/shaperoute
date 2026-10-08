# TASK-260 — Il nome dell'app diventa «MuW»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-260-app-name-muw` (parte A), `feat/TASK-260-logo-muw` (parte B)

## Obiettivo

L'app si chiama «MuW»: sotto l'icona, in cima a «Draw», nel post
condiviso, nei permessi di sistema, nelle pagine di aiuto, condizioni e
privacy, nei testi che l'API scrive (Strava, GPX, tag) e in ogni testo
dell'app nelle cinque lingue. Chiesto dall'utente il 2026-10-06
(«Cambia il nome dell'app con MuW»; ADR-0224).

## Contesto da leggere

- `docs/UI.md` §«Il tema» e §«L'icona, il logo e lo splash».
- `docs/AGENTI.md` «Chi tocca cosa» (le righe nuove di `i18n/*` sono
  di TASK-208 B fino al merge della PR #425).

## Cosa fare

1. `app.json`: `name` e i testi dei permessi di foto e fotocamera.
2. I testi dell'app con il nome dentro, fuori dalle tabelle delle lingue:
   il titolo di «Draw» (`ChooseScreen`), il post (`PostImage`),
   l'etichetta dell'avvio (`LaunchIntro`), «Location is off for…» in
   `App.tsx`, aiuto, condizioni e privacy (`about/content/*`), lo stile
   della mappa e la pagina del motore sul telefono; i loro test.
3. L'API: «Drawn with…» e «Recorded with…» di Strava, le pagine di
   ritorno da Strava, l'errore di modifica, il `creator` del GPX, il
   messaggio dei tag; `tools/phone_engine` (la riga delle licenze).
4. **Dopo il merge della PR #425** (TASK-208 B, che aggiunge righe a
   `i18n/*`): le sette chiavi inglesi con «Sgrava» e le loro quattro
   traduzioni, con i componenti che le usano (`PaddleNotice`,
   `StravaSetting`, `reactionKinds`, `StravaPostRow`,
   `NotificationsSetting`, `PhoneSetting`, `LocationOff`, `PublicParts`) e i test.
5. `docs/UI.md`, `STATUS.md`, `DECISIONS.md` (ADR-0224).
6. **Parte B, il logo** (scelta dell'utente: «terrei il cuore sullo
   sfondo giallo però con scritto muw»): `docs/brand/make_brand.py`
   genera da `heartLine.ts` e `tokens.ts` l'icona (cuore nero su
   giallo), `splash-logo-dark.png` (la parola «MuW» nel tratto del
   vecchio logo), lo splash Android (il cuore), le icone adattive
   Android (fondo giallo), la favicon e i vettoriali `muw-*.svg`; il
   fondo dell'icona adattiva in `app.json` diventa giallo; i vecchi
   `sgrava-*.svg` vanno via.

## Criteri di accettazione

- [x] `app.json` ha `name: "MuW"`; «Sgrava» non compare più in nessuna
      stringa dell'app fuori da `i18n/*` e dai componenti del punto 4.
- [x] L'API scrive «Drawn with MuW» / «Recorded with MuW», le pagine di
      ritorno da Strava dicono «Go back to MuW», il GPX ha `creator="MuW"`.
- [x] Le tabelle delle cinque lingue non contengono «Sgrava» (punto 4).
- [x] `tsc`, `expo lint`, Prettier, jest sui file toccati, `ruff`,
      `black` e pytest di `test_strava.py` e `test_run_gpx.py` verdi.
- [x] Parte B: l'avvio mostra il cuore e «MuW»; l'icona è il cuore su
      giallo; l'anteprima è approvata dall'utente prima del merge.
      Con l'aggiornamento su `preview` (Expo Go) arrivano subito solo
      la scritta all'avvio e in «salvato»: icona, splash e favicon di
      `app.json` si vedono solo con una build nativa.

## File toccati

```
apps/mobile/app.json
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/about/content/en.ts
apps/mobile/src/about/content/it.ts
apps/mobile/src/about/AboutPage.test.tsx
apps/mobile/src/about/AboutInProfile.test.tsx
apps/mobile/src/about/documents.test.ts
apps/mobile/src/engine/page.ts
apps/mobile/src/intro/LaunchIntro.tsx
apps/mobile/src/intro/LaunchIntro.test.tsx
apps/mobile/src/intro/HeartBadge.test.tsx
apps/mobile/src/map/mapStyle.ts
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/share/PostImage.tsx
services/api/shaperoute_api/strava.py
services/api/shaperoute_api/run_gpx.py
services/api/shaperoute_api/drawings.py
services/api/tests/test_strava.py
services/api/tests/test_run_gpx.py
tools/phone_engine/phone_engine.py
docs/UI.md · docs/STATUS.md · docs/DECISIONS.md · docs/tasks/TASK-260.md
— parte B (punto 6):
apps/mobile/app.json (il fondo dell'icona adattiva)
apps/mobile/assets/{icon,favicon,splash-logo-dark,splash-icon-dark,android-icon-foreground,android-icon-background,android-icon-monochrome}.png
docs/brand/make_brand.py · muw-logo.svg · muw-mark.svg (via sgrava-logo.svg, sgrava-mark.svg)
— dopo la PR #425 (punto 4):
apps/mobile/src/i18n/{de,es,fr,it}.ts
apps/mobile/src/paddle/PaddleNotice.tsx · src/paddle/safetyNotice.test.tsx
apps/mobile/src/strava/StravaSetting.tsx
apps/mobile/src/social/reactionKinds.ts · reactionKinds.test.ts · DrawingReactions.test.tsx
apps/mobile/src/share/StravaPostRow.tsx · SharePost.test.tsx
apps/mobile/src/settings/NotificationsSetting.tsx · NotificationsSetting.test.tsx
apps/mobile/src/settings/PhoneSetting.tsx · PhoneSetting.test.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
apps/mobile/src/location/LocationOff.tsx · LocationOff.test.tsx
apps/mobile/src/social/PublicParts.tsx · PublicRow.test.tsx
apps/mobile/src/screens/NavigateScreen.test.tsx · FreeRunScreen.test.tsx
```

## Fuori scope

- Il badge di «Draw» (`HeartBadge`) e l'animazione dell'avvio non
  cambiano: il logo nuovo è fatto di loro.
- `bundleIdentifier` (`com.lppl1316.sgrava`) e `slug` (`shaperoute`):
  cambiarli cambia l'app sull'App Store e il progetto EAS; non si tocca.
- Il sito (`site/`, TASK-237) e i documenti (`docs/*`, `CLAUDE.md`), che
  restano con il nome di prima dove raccontano il passato.
- I nomi nel codice (`sgrava` in commenti, variabili, file), che non si
  vedono.

## Esito

Fatto il 2026-10-06. **Parte A** (PR #426, merge `717eb69b`): l'app si
chiama «MuW» sotto l'icona, nei permessi, in ogni testo delle cinque
lingue, in aiuto/condizioni/privacy, e l'API scrive «Drawn with MuW»,
«Go back to MuW», `creator="MuW"`; su `preview` (gruppo `36e2a9f1`).
**Parte B** (PR #428, merge `873de538`, anteprima approvata dall'utente:
«si va bene così»): il cuore su giallo con la scritta «MuW» come logo e
icona, generati da `docs/brand/make_brand.py`; su `preview` (gruppo
`9585ffac`), server a `873de538` con l'ok dell'utente. **Restano**: icona,
splash e favicon si vedono solo con una build nativa; il sito (`site/`, TASK-237) e i nomi
nel codice (`sgrava` in file e variabili) tengono il nome vecchio.
