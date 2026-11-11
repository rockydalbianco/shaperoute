# TASK-442 — Sagoma fantasma e attesa animata

**Stato**: Done · 2026-11-11 · in `main` con #1143 (`ee0ca7ce`); esce col
prossimo OTA di produzione, del Coordinatore, col sì dell'utente
**Fase**: 5 · **Branch**: `feat/TASK-442-shape-ghost`
**Dipende da**: TASK-347 A (`placed_outline` nel contratto), TASK-361
(l'anteprima di Crea)
**ADR**: nessuno · numero dal Coordinatore l'11 novembre 2026 (P1 di
`out/prova-app-2026-11-11/PROPOSTE.md`)

## Obiettivo

Nella prova dell'11 novembre 2026 (cuore da 5 km da Piazza del Duomo,
Trento) si è visto che nel risultato non c'è modo di confrontare il percorso
con la forma chiesta, e che l'attesa è una mappa quasi vuota con uno spillo.
Alla fine: sotto il percorso c'è la forma ideale, e durante l'attesa la
stessa sagoma si muove piano sopra la mappa.

## Come funziona

- **Nel risultato** la sagoma è `placed_outline` di `RouteResult` (TASK-347,
  ADR-0300): il disegno come il motore l'ha messo, in WGS84. Lo danno già il
  server e il motore sul telefono, anche per ogni alternativa; l'app non lo
  disegnava. `MapView` ha la prop `ghost`, la pagina della mappa il layer
  `ghost` sotto `others` e sotto il percorso (messaggio `showGhost`). Vuoto o
  assente (sull'acqua, API vecchia): niente sagoma, nessun errore.
- **Nell'attesa** la posizione vera non esiste ancora: la sagoma è sopra la
  mappa, a schermo, **non georiferita** (`ShapeGhost`, che `MapView` mostra
  nella prop nuova `over`, sopra la pagina e sotto la sua barra). Il contorno è quello
  che l'app ha già: per una forma del catalogo `shapeScale` (lo stesso
  dell'anteprima di Crea), per un'immagine o un disegno l'`outline` della
  richiesta. Per una parola l'app non ha le lettere: niente sagoma, l'attesa
  resta com'è.
- **Animazione**: la sagoma respira (opacità) e un punto giallo la percorre,
  come una penna. Con «Riduci movimento» è ferma e senza punto.
- **Colori**: il token `shapeGhost` in `tokens.ts` (da `color.text`, mai
  giallo: il giallo è il percorso; il punto è `route.color`). Sulla mappa è
  una linea tratteggiata sottile, così non si confonde con le alternative
  grigie; tempi dell'animazione nello stesso token.
- **Dove**: solo sul risultato di «Draw» (`drawnOnMap` in `App.tsx`), non
  mentre si corre, né in «Explore», né sui percorsi a tema.
- L'app non inventa geometrie e il contratto non cambia.

## Criteri di accettazione

- [x] Con un risultato che porta `placed_outline`, la pagina della mappa
      riceve `showGhost` con quelle linee; cambiando variante riceve quelle
      della variante scelta; senza, o lasciato il risultato, la sagoma va via
      (`MapViewGhost.test.tsx`, `mapPageGhost.test.ts`,
      `AppShapeGhost.test.tsx`).
- [x] Il layer `ghost` sta sotto `others` e sotto `route`, coi valori di
      `shapeGhost` (`mapPageGhost.test.ts`).
- [x] Durante l'attesa di una forma del catalogo o di un'immagine si vede la
      sagoma; per una parola no (`waitingOutline.test.ts`,
      `ShapeGhost.test.tsx`, `AppShapeGhost.test.tsx`).
- [x] La sagoma d'attesa si muove, e con «Riduci movimento» sta ferma
      (`ShapeGhost.test.tsx`).
- [x] `tsc` pulito, test dei file toccati verdi (66 file, 523 test: `src/map`,
      `src/theme`, i nuovi, `AppChoices`, `AppTurnedMap`). Impronta iOS: il
      diff è solo JS/TS (nessun `package.json`, `app.json`, `app.config.ts`,
      nativo), attesa `6f8bba4c`; non misurata su copia pulita.
- [x] Screenshot prima e dopo dell'attesa e del risultato in
      `out/TASK-442/` (cuore 5 km da 46.0679, 11.1211): `before-*.png`,
      `after-*.png`, il foglio `prima-dopo.png`.
- [x] Sì dell'utente su ciò che si vede, prima di «#1143 pronta»: l'11
      novembre 2026, sugli screenshot prima/dopo (`prima-dopo.png` e la
      variante B), alla domanda «Ti va bene come si vedono la sagoma
      nell'attesa e quella tratteggiata sotto il percorso?», parole sue:
      «Sì, va bene».

## File toccati

- `apps/mobile/App.tsx`
- `apps/mobile/src/map/MapView.tsx`
- `apps/mobile/src/map/mapPage.ts`
- `apps/mobile/src/map/messages.ts`
- `apps/mobile/src/theme/tokens.ts` (solo il token `shapeGhost`)
- `apps/mobile/__tests__/AppShapeGhost.test.tsx` (nuovo)
- `apps/mobile/src/map/MapViewGhost.test.tsx` (nuovo)
- `apps/mobile/src/map/mapPageGhost.test.ts` (nuovo)
- `apps/mobile/src/route/ShapeGhost.tsx` (nuovo)
- `apps/mobile/src/route/ShapeGhost.test.tsx` (nuovo)
- `apps/mobile/src/route/waitingOutline.ts` (nuovo)
- `apps/mobile/src/route/waitingOutline.test.ts` (nuovo)
- `docs/tasks/TASK-442.md`
- `docs/UI.md`, `docs/archive/COMPLETATI.md` (PR di soli documenti)

## Fuori scope

- L'inquadratura della mappa del risultato (TASK-443).
- La sagoma mentre si corre o in «Explore»: solo nel risultato di «Draw».
- `WhileRouting.tsx`, `RoutePanel.tsx`, i18n, API, motore, `engine.zip`.
- Una sagoma d'attesa per le parole: servirebbero le lettere del motore.

## Dove sono arrivato

- 2026-11-11: lista dei file approvata dal Coordinatore; `App.tsx` è di
  questa task dal merge della #1131 fino al merge della sua PR. Screenshot
  «prima» in `out/TASK-442/before-wait.png` e `before-result.png`. Per
  vedere l'attesa nel simulatore serve un'API locale con `--no-route-store`
  (quella sulla porta 8000 risponde subito col percorso tenuto).
- 2026-11-11: codice e test scritti, screenshot «dopo» fatti (variante A e
  B: ognuna ha la sua sagoma). PR #1143 aperta. Mancano: il sì dell'utente su ciò
  che si vede, poi «#NNN pronta» al Coordinatore, che mergia lui; dopo il
  merge la PR di soli documenti (STATUS → COMPLETATI, stato `Done`) e
  l'OTA, col sì dell'utente, dal Coordinatore.
- 2026-11-11: sì dell'utente, «#1143 pronta»; main unito nel ramo su
  richiesta del Coordinatore (le modifiche a `tokens.ts` di #1132 e di
  questa non erano mai passate insieme dalla CI), poi il merge suo.

## Esito

In `main` con #1143 (`ee0ca7ce`, 2026-11-11): nel risultato di «Draw» la
forma ideale è tratteggiata sotto il percorso, una per variante; nell'attesa
la sagoma respira al centro della mappa con un punto giallo che la percorre.
Nessun cambio al contratto, nessun testo nuovo, solo JS/TS. `UI.md`
aggiornato («Più percorsi fra cui scegliere» e l'attesa).

Resta: l'OTA di produzione (Coordinatore, col sì dell'utente; l'impronta iOS
la misura lui su copia pulita, attesa `6f8bba4c`) e la prova sul telefono.
TASK-443 (inquadratura) parte dagli stessi file della mappa: `MapView` ha
già le prop `ghost` e `over`; la sagoma può uscire di poco dai bordi del
percorso, e l'inquadratura oggi guarda solo il percorso.
