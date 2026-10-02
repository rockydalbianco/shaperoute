# TASK-179 — L'animazione all'avvio: il cuore che si disegna sul giallo

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-179-launch-animation`

Chiesto dall'utente il 2026-10-02: «non hai più messo il logo e
l'animazione, che deve durare almeno due secondi quando apri l'applicazione:
l'animazione di un cuore che si disegna su uno sfondo giallo, come il video».

## Obiettivo

Aprendo l'app, per almeno due secondi si vede il fondo giallo con un cuore
che si disegna e il logo; poi compare l'app. Anche in Expo Go, dove la
schermata di avvio di TASK-165 non si vede.

## Contesto da leggere

- `docs/UI.md` «Il logo e l'icona»
- `docs/DECISIONS.md` ADR-0134 (la schermata di avvio nativa), ADR-0129
- `apps/mobile/index.ts`, `apps/mobile/src/explore/RouteThumb.tsx` (una
  linea disegnata con View girate: nell'app non c'è SVG)
- Il video: `out/social/sgrava-demo-12s.mp4` e `out/social/video-src/`
  (fuori da git), il cuore di Milano da 10 km di `catalog/seed/milano.json`

## Cosa si sa già

- La schermata di avvio di TASK-165 è nativa e ferma, e si vede solo in una
  build propria: in Expo Go l'utente non vedeva né logo né animazione.
- `App.tsx` è di TASK-172 e TASK-174: qui non si tocca. L'animazione sta
  sopra l'app, montata da `index.ts`.
- Sotto jest le animazioni di React Native finiscono subito: la durata la
  tiene un timer, non la fine dell'animazione.

## Cosa fare

1. `src/intro/heartLine.ts`: il cuore di Milano del video, semplificato a
   8 m e messo in un riquadro largo 1000; i tratti in ordine, ognuno con il
   suo momento lungo la linea.
2. `src/intro/LaunchIntro.tsx`: il giallo che riempie lo schermo dal
   centro, il cuore disegnato da una penna, il logo sotto, la dissolvenza.
3. `src/intro/Root.tsx` e `index.ts`: l'app parte sotto l'animazione.
4. Test; guardata in un simulatore; ADR-0147, `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [x] All'apertura si vede il fondo giallo con il cuore che si disegna e il
      logo, per almeno 2 secondi (2,4 s, più 0,3 s di dissolvenza).
- [x] Si vede in Expo Go, senza una build propria.
- [x] L'app parte sotto l'animazione e si usa appena l'animazione è finita.
- [x] Nessuna dipendenza nuova; nessun colore scritto a mano.
- [x] `App.tsx` non è toccato.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Vista sull'iPhone dell'utente (dopo la pubblicazione su `preview`).

## File toccati

```
apps/mobile/index.ts
apps/mobile/src/intro/heartLine.ts
apps/mobile/src/intro/heartLine.test.ts
apps/mobile/src/intro/LaunchIntro.tsx
apps/mobile/src/intro/LaunchIntro.test.tsx
apps/mobile/src/intro/Root.tsx
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-179.md
```

## Fuori scope

- La schermata di avvio nativa (`app.json`, TASK-165): resta nera con il
  logo giallo. Farla gialla, perché in una build propria il passaggio sia
  senza stacco, è una riga di `app.json` e una scelta dell'utente.
- Saltare l'animazione con un tocco, e una versione ferma per chi ha
  «Riduci movimento»: se qualcuno le chiede.
- Il testo dell'ora e della batteria scuro sul giallo: la barra di stato la
  decide `App.tsx`, che monta dopo; per 2,4 secondi resta chiara.
- Suono o vibrazione.

## Cosa è stato verificato

- **Simulatore** (iPhone 17, iOS 27, Expo Go, Metro dal worktree): filmata
  l'apertura. Il giallo riempie lo schermo in 0,35 s, il cuore si disegna
  in 1,6 s partendo dall'incavo, resta 0,45 s con il logo nero sotto, poi
  in 0,3 s compare «Draw», già caricata. Il giallo resta sullo schermo
  2,4 secondi.
- In Expo Go prima c'è la schermata di caricamento di Expo Go (bianca, con
  l'icona): quella non è nostra e non si toglie.
- Non provata su un telefono: serve la pubblicazione su `preview`.

## Esito

Fatto (2026-10-02). Aprendo l'app si vede il giallo, il cuore di Milano del
video che si disegna e il logo, per 2,4 secondi, poi l'app; funziona in
Expo Go. 12 test nuovi; lint, typecheck e prettier puliti. La suite intera
sul Mac, molto carico, ha avuto un test di `AppFreeRun` fallito una volta e
passato da solo: non tocca questi file. **Da pubblicare su `preview` con
l'ok dell'utente e da guardare sull'iPhone.** Rimandato, nel «Fuori scope»:
la schermata nativa gialla, «Riduci movimento», la barra di stato scura.
