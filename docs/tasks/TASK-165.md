# TASK-165 — La schermata di avvio con il logo

**Stato**: In corso
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
       "imageWidth": 200,
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

- [ ] `app.json` ha il plugin; `npx expo config` lo legge senza errori.
- [ ] Il prebuild di iOS genera la schermata di avvio con fondo `#0A0A0B` e
      il logo.
- [ ] L'app in Expo Go parte come prima (bundle esportato, test verdi).
- [ ] Test, lint, typecheck e prettier verdi.
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

## Dove sono arrivato

2026-10-02: branch e worktree creati da `main` 69b289c (dopo la #168).
Fatto: questo file e `apps/mobile/assets/splash-logo.png`. Da fare: tutto
dal punto 1. Le immagini di partenza e gli script che le disegnano (Pillow,
con il Python di `services/api/.venv`) stanno in `out/social/splash-draft/`,
fuori dal repository.

## Esito

*(si compila a fine task)*
