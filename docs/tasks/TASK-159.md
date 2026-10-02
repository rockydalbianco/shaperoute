# TASK-159 — L'icona dell'app con il nuovo logo, e il nome «Sgrava»

**Stato**: Done
**Fase**: 4 · **Branch**: `chore/TASK-159-app-icon`

Chiesto dall'utente il 2026-10-02, dopo aver visto tre proposte di logo:
«scelgo la A, metti l'icona nell'app». Poi, vista la PR: «cambia il nome
sotto l'icona in Sgrava».

## Obiettivo

L'icona dell'app è il nuovo segno di Sgrava (ADR-0129), non più il
segnaposto di Expo, e sotto c'è scritto «Sgrava», non «ShapeRoute».

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0129
- `docs/UI.md` «Il logo e l'icona»
- `apps/mobile/app.json`

## Cosa fare

1. Le sei immagini di `apps/mobile/assets/` ridisegnate con il segno: la
   S gialla (`#FFD02B`) su nero (`#0A0A0B`).
2. `app.json`: il fondo dell'icona adattiva di Android da `#E6F4FE` a
   `#0A0A0B`.
3. Il segno e il logo in vettoriale in `docs/brand/`, da cui rifare le
   immagini.
4. `app.json`: `name` da «ShapeRoute» a «Sgrava». `slug`,
   `bundleIdentifier` e il progetto EAS restano com'erano.
5. `DECISIONS.md`, `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [x] `icon.png` è 1024 × 1024, senza trasparenza, con il segno giallo su
      nero.
- [x] Su Android il segno sta nel cerchio sicuro dell'icona adattiva
      (61% del lato) e il fondo è nero; l'icona a un colore è il segno
      bianco su trasparente.
- [x] `npx expo config` legge `app.json` senza errori e dà `name: Sgrava`.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Vista sul telefono in una build propria (TASK-152): in Expo Go
      l'icona sulla schermata di casa resta quella di Expo Go.

## File toccati

```
apps/mobile/assets/icon.png
apps/mobile/assets/android-icon-foreground.png
apps/mobile/assets/android-icon-background.png
apps/mobile/assets/android-icon-monochrome.png
apps/mobile/assets/favicon.png
apps/mobile/assets/splash-icon.png
apps/mobile/app.json
docs/brand/sgrava-mark.svg
docs/brand/sgrava-logo.svg
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-159.md
```

## Fuori scope

- La schermata di avvio: `splash-icon.png` è ridisegnata ma `app.json` non
  la usa, come prima. Mostrarla è una scelta su cosa si vede all'apertura.
- I testi dell'app che nominano «ShapeRoute» («Location is off for
  ShapeRoute…» in `App.tsx`, `NavigateScreen.tsx`, `FreeRunScreen.tsx`):
  un seguito, segnalato al coordinatore perché `App.tsx` non è di questo
  task.
- Il logo dentro l'app (la scritta «Sgrava» in cima a «Draw»).
- I post per Instagram e l'immagine del profilo: stanno nel canvas.

## Esito

Fatto (2026-10-02). L'icona è il segno giallo su nero, anche su Android;
`npx expo config` legge `app.json`, 739 test dell'app verdi, lint, typecheck
e prettier puliti. Le immagini sono state guardate una per una, non su un
telefono: **da vedere in una build propria** (TASK-152), perché in Expo Go
sulla schermata di casa resta l'icona di Expo Go. Il nome dell'app è
«Sgrava» (`name` in `app.json`), chiesto dall'utente a PR aperta; una
cartella `ios/` già generata in locale porta ancora il nome vecchio e va
rifatta con `npx expo prebuild --clean`. Restano: la schermata di avvio,
all'utente, e i tre testi «Location is off for ShapeRoute…», un seguito.
