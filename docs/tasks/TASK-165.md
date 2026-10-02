# TASK-165 — La schermata di avvio con il logo

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-165-splash-screen`

Chiesto dall'utente il 2026-10-02, dopo l'icona (TASK-159): «metti anche la
schermata di avvio con il logo».

## Obiettivo

All'apertura l'app mostra il logo di Sgrava giallo su nero, non una
schermata vuota.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0129 (il logo) e ADR-0134 (questa scelta, da
  scrivere)
- `docs/UI.md` «Il logo e l'icona»
- `apps/mobile/app.json`

## Cosa si sa già

- In Expo SDK 57 la chiave `splash` di `app.json` non esiste più (resta solo
  quella del web). La schermata di avvio si fa con il plugin del pacchetto
  ufficiale `expo-splash-screen`, che nel progetto non c'è.
- **La dipendenza nuova l'utente l'ha approvata** il 2026-10-02
  («Sì, aggiungila»): `expo-splash-screen` 57.0.9, l'etichetta `sdk-57`.
  Porta `xml2js`, `@expo/image-utils` e `@expo/config-plugins`.
- Il plugin su iOS mette l'immagine in un quadrato largo `imageWidth`
  punti: l'immagine deve essere quadrata. Su Android 12 e seguenti il
  sistema la ritaglia in un cerchio: un logo largo ci starebbe minuscolo.
- Come l'icona, si vede solo in una build propria (TASK-152), non in Expo
  Go. Nessuna chiamata a `SplashScreen` nel codice: basta il plugin.

## Cosa fare

1. **Prima di toccare `package.json` e `package-lock.json`**: conferma dal
   coordinatore che sono liberi (li teneva TASK-115).
2. La dipendenza, dal worktree, senza toccare i `node_modules` del checkout
   principale: `npm install expo-splash-screen@~57.0.9 -w @shaperoute/mobile
   --package-lock-only`. Per i controlli locali il pacchetto va copiato in
   `node_modules/expo-splash-screen` del worktree (`npm pack` + estrazione).
3. `apps/mobile/app.json`, in `plugins`:

   ```json
   [
     "expo-splash-screen",
     {
       "backgroundColor": "#0A0A0B",
       "image": "./assets/splash-icon.png",
       "imageWidth": 240,
       "ios": { "image": "./assets/splash-logo.png", "imageWidth": 260 }
     }
   ]
   ```

   Su iOS il logo intero (`splash-logo.png`, già in questo branch: 1040 ×
   1040, trasparente, il logo largo quanto il quadrato); su Android il
   segno da solo (`splash-icon.png`, già in `main` da TASK-159), che sta nel
   cerchio.
4. Controlli: `npx expo config --type public`; `npx expo prebuild
   --platform ios --no-install` nel worktree, guardare
   `SplashScreen.storyboard` e l'immagine generata, poi cancellare la
   cartella `ios/` generata; test, lint, typecheck, prettier; `npx expo
   export --platform ios` per vedere che il bundle di Expo Go si fa ancora.
5. ADR-0134, `UI.md`, `STATUS.md`.
6. Dopo il merge: `npm install` nel checkout principale (`PASSAGGIO.md`).

## Criteri di accettazione

- [x] `app.json` ha il plugin; `npx expo config` lo legge senza errori.
- [x] Il prebuild di iOS genera la schermata di avvio con fondo `#0A0A0B` e
      il logo.
- [x] L'app in Expo Go parte come prima (bundle esportato, test verdi).
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Vista sul telefono in una build propria (TASK-152).

## File toccati

```
apps/mobile/package.json
package-lock.json
apps/mobile/app.json
apps/mobile/assets/splash-logo.png
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-165.md
```

## Fuori scope

- Tenere la schermata finché l'app è pronta (`SplashScreen.preventAutoHide`):
  vuole codice in `App.tsx`.
- Una versione chiara: il tema dell'app è solo scuro (ADR-0046).
- I testi «Location is off for ShapeRoute…»: TASK-160.

## Cosa è stato verificato

- **Expo Go**: `expo-splash-screen` ~57.0.9 è in
  `node_modules/expo/bundledNativeModules.json`, l'elenco dei moduli
  dell'SDK 57 che Expo Go ha dentro. L'app non lo importa (c'è solo il
  plugin in `app.json`) e `npx expo export --platform ios` fa il bundle
  come prima: un `eas update` non cambia niente per chi apre l'app in Expo
  Go.
- **iOS**: `npx expo prebuild --platform ios --no-install` genera
  `Sgrava/SplashScreen.storyboard` con il logo in un riquadro di 260 × 260
  al centro, il colore `SplashScreenBackground` a `#0A0A0B` e le tre
  immagini del logo (780 × 780 a 3x). Composta su uno schermo di 390 × 844,
  il logo è centrato e leggibile.
- **Android**: il prebuild scrive `splashscreen_background` `#0A0A0B` e
  `splashscreen_logo`. Provato con `imageWidth` 200: il segno occupava
  296 × 333 px su 1152 a xxxhdpi. Poi portato a 240 senza rifare il
  prebuild: 1,2 volte tanto, circa 355 × 400 px, diagonale 535 px, sempre
  dentro il cerchio di 768 px.
- Le cartelle `ios/` e `android/` generate sono state cancellate; le
  modifiche che il prebuild aveva fatto a `app.json` (`android.package`) e a
  `package.json` (due script) sono state annullate.
- Non provata su un telefono né nel simulatore: serve una build propria.

## Esito

Fatto (2026-10-02). La schermata di avvio è configurata: fondo nero, logo
intero su iOS, segno su Android. `npx expo config` legge il plugin; 739
test dell'app verdi, lint, typecheck e prettier puliti. Una prima
esecuzione dei test era fallita senza che il motivo restasse nel registro;
le quattro successive sono passate tutte. **Da vedere in una build
propria** (TASK-152). Dopo il merge: `npm install` nel checkout principale.
