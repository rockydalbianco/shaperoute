# TASK-346 — «Edit the drawing» nel Feed: la traccia sulla mappa dov'è stata corsa

**Stato**: In corso — pronto in PR, aspetta il merge del Coordinatore
**Fase**: 4 · **Branch**: `feat/TASK-346-edit-track-in-place` · **ADR**: ADR-0299

Numero e ADR dal Coordinatore (2026-10-29: TASK-346, ADR-0299).

## Obiettivo

Su un disegno di un membro aperto dal Feed, «Edit the drawing» («Modifica il
disegno») fa modificare **la traccia sulla mappa**, nel posto dove è stata
corsa e grande com'è, invece del disegno spostato e ridimensionato intorno
alla partenza dell'utente.

## Contesto

Richiesta dell'utente del 2026-10-29: «NEL FEED QUANDO PREMO MODIFICA IL
DISEGNO DEVO POTER MODIFICARE LA TRACCIA SULLA MAPPA NON IL DISEGNO IN SE».

Prima del task (TASK-320 parte B, TASK-331, ADR-0288): la scheda del disegno
prendeva la traccia corsa, la raddrizzava e chiudeva nel riquadro [-1, 1]
(`favoriteRoute.outlineOf`) e la metteva su «Draw on the map» **nel mezzo
della partenza di «Draw»**, lunga quanto la sceglierebbe «Draw it near me»
(`App.tsx`, `editCardOf` → `useMapCanvas.edit` → `placeAt`).

Alla domanda su come doveva funzionare, l'utente ha scelto **«Traccia
dov'è»** (fra «Traccia vicino a me» e «Trascinare il percorso» come Google
Maps): la mappa si apre nel posto dove è stata corsa, con la traccia vera
alla sua grandezza; si modifica con gli strumenti di TASK-331 (Draw, Line,
Erase, Move e la piega, Undo/Redo) e «Draw route» la rimette sulle vie lì.
Per portarla vicino a sé resta «Draw it near me».

## Cosa fare

1. `src/route/figureLines.ts`: `trackInPlace(points)` dà le linee della
   traccia nel riquadro della figura insieme al punto del suo mezzo e ai
   metri di un'unità, calcolati in metri sul piano (`mapdraw/plane.ts`), così
   `figure.onMap` rimette ogni punto dov'era; `drawingTrack(drawing)`
   sostituisce `drawingLines` con le stesse regole (niente per un'emoji, una
   parola, una corsa senza percorso o importata, un post di sole foto, una
   traccia troppo corta).
2. `src/mapdraw/useMapCanvas.ts`: `editInPlace(lines, centre, unitM)` mette
   il disegno lì e così grande (dentro le distanze di «Draw», come ogni
   figura), con la mappa inquadrata su di lui, l'interruttore su «Draw» e
   «Undo» che lo toglie. `edit` resta per le figure di «Explore» e del
   risultato.
3. `App.tsx`: la scheda del disegno usa `drawingTrack` ed `editInPlace`;
   la scheda di «Explore» e il risultato di «Draw» restano come prima.
4. Test: `figureLines.test.ts`, `useMapCanvas.test.ts`,
   `__tests__/AppEditDrawing.test.tsx` (la traccia corsa a Rovereto resta a
   Rovereto, e «Draw route» parte dal primo punto della corsa).
5. Documenti: ADR-0299, `UI.md` («Edit the drawing»), `STATUS.md`,
   `INDEX.md`.

## File toccati

- `apps/mobile/src/route/figureLines.ts`, `figureLines.test.ts`
- `apps/mobile/src/mapdraw/useMapCanvas.ts`, `useMapCanvas.test.ts`
- `apps/mobile/App.tsx`
- `apps/mobile/__tests__/AppEditDrawing.test.tsx`
- `docs/tasks/TASK-346.md` (nuovo), `docs/DECISIONS.md`, `docs/UI.md`,
  `docs/STATUS.md`, `docs/INDEX.md`

## Criteri di accettazione

- [x] Su un disegno del Feed «Edit the drawing» apre «Draw on the map» con la
  traccia nel posto dove è stata corsa e alla sua grandezza (entro le
  distanze di «Draw»), non intorno alla partenza dell'utente.
- [x] «Draw route» chiede il percorso da lì: la partenza è il primo punto
  della corsa.
- [x] Niente cambia per le schede di «Explore», per il risultato di «Draw»,
  per le emoji, le parole, le corse senza percorso e «Paddle».
- [x] Nessun testo nuovo, nessuna dipendenza, niente nel contratto, nell'API
  e nel motore; impronta iOS `83793e26` invariata.
- [x] Test deterministici verdi.

## Note

- Solo JS dell'app: arriva con un OTA.
- `App.tsx` lo tocca anche TASK-340 («Freehand» primo in «Draw»), che parte
  dopo la #644: chi entra per secondo si riallinea tenendo le righe
  dell'altro.
