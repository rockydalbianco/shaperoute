# TASK-396 — «Freehand» in «Draw» anche con «Paddle»

**Stato**: In corso — aspetta il via del Coordinatore (conferma della
richiesta con l'utente) e il sì dell'utente sui testi
**Fase**: 4 · **Branch**: `feat/TASK-396-paddle-freehand` · **ADR**: ADR-0313
(precisazione della scelta 4, nessun ADR nuovo)

Numero dal Coordinatore il 2026-11-05.

## Obiettivo

Con «Paddle», in «Draw», c'è «Freehand» accanto alle forme del catalogo: la
mappa per disegnare a mano si apre anche sull'acqua, e «Draw route» chiede al
motore il disegno sull'acqua di TASK-369 B (`drawn_water.plan_drawn_water`).

## Contesto

Richiesta dell'utente del 2026-11-05, riferita dalla sessione cloud «Nuoto in
acque libere»: «Dai le possibilità di disegnare a mano libera anche nella
sezione draw con la canoa sui laghi e Mari». Cambia la scelta 4 di TASK-369
(«niente "Freehand" sull'acqua in "Draw"») e i criteri di TASK-320 e TASK-340
(«Con "Paddle" "Freehand" non c'è»).

Cosa c'è già in `main` (`ae6c2e2a`):

- **Motore e API** (TASK-369 B, #722): un `ImageRequest` con
  `activity: "paddling"` va a `images.plan_drawing_on_water`, che usa
  `drawn_water.plan_drawn_water`: il disegno va dove c'è posto vicino alla
  partenza. Fuori dall'impronta del motore (`DRAWN_WATER_ONLY`).
- **La tavola** (`mapdraw/useMapCanvas.ts`, `canvasRequest.ts`) manda già
  l'attività di «Draw»: un disegno fatto con «Paddle» arriva all'API come
  `ImageRequest` «paddling», come «Edit the drawing» di TASK-369 B.
- **L'app** (`route/RoutePanel.tsx`, `shapesOnly`): con «Paddle» niente
  `Segmented`, solo la nota «On the water, a shape of the catalogue.» e le
  forme. Il nuoto (TASK-323) ha «Freehand», «Shape», «Image» e toglie solo
  «Word»: è il modello.
- **Parole sull'acqua**: l'API le rifiuta (`plan_water`, «The words of
  RouteRequest refuse the water»): niente «Word» con «Paddle».
- **Server**: TASK-369 B sul server è in coda al Coordinatore (sì
  dell'utente del 2026-11-04). Col server di prima un disegno sull'acqua
  mostra «On the water, a shape of the catalogue.» (`problems.ts`, ripiego di
  TASK-369 B). L'OTA di questo task va dopo il server.

## Cosa fare

1. `RoutePanel.tsx`: con «Paddle» il `Segmented` con «Freehand» e «Shape»
   (né «Word», né «Image»: vedi «Fuori scope»); la nota «On the water, a shape
   of the catalogue.» non c'è più in «Draw» (resta il testo del ripiego in
   `problems.ts`). Modifica piccola e locale: TASK-376 B3b tocca lo stesso file.
2. `App.tsx` solo se serve (oggi `drawKind` è già «shape» con «Paddle», e
   `onFreehand={onOpenCanvas}` è già passato).
3. `problems.ts`: sull'acqua, per un disegno (`kind === "image"`), un testo
   che parla di disegno e non offre le forme del catalogo (testi sotto, col
   sì dell'utente). Vale anche per un disegno a nuoto, che passa dalla stessa
   funzione.
4. i18n en, de, es, fr, it dei testi approvati.
5. Test deterministici: `RoutePanelPaddle` (con «Paddle» c'è «Freehand», non
   «Word» né «Image», nessuna nota), `AppPaddle` («Freehand» apre la tavola e
   «Draw route» manda un `ImageRequest` «paddling»), `problems` (i testi
   sull'acqua di un disegno).

## Testi da approvare (una domanda alla volta)

1. La nota «On the water, a shape of the catalogue.» in «Draw»: **tolta**,
   come per il nuoto (nessun testo nuovo).
2. Un disegno che non sta sull'acqua (proposta):
   - «This drawing does not fit on the water near this start. Try a shorter
     distance, or another start.»
   - «This drawing does not fit on the water here at this distance. It fits
     at about {km} km.» / «… {mi} mi.»

## Criteri di accettazione

- [ ] Con «Paddle», in «Draw», «Freehand» c'è prima di «Shape»; «Word» e
      «Image» non ci sono; la nota «On the water, a shape of the catalogue.»
      non c'è.
- [ ] «Freehand» con «Paddle» apre la tavola; «Draw route» manda all'API un
      disegno con `activity: "paddling"`.
- [ ] Un disegno sull'acqua che non ci sta mostra i testi approvati, senza le
      forme del catalogo da scegliere.
- [ ] Corsa, nuoto e le altre attività in «Draw» come prima.
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npm run format:check`, `npm test`
      verdi; impronta iOS `6f8bba4c` (solo JavaScript).

## File toccati

```
docs/tasks/TASK-396.md
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/problems.ts
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
apps/mobile/src/route/RoutePanelPaddle.test.tsx
apps/mobile/src/route/problems.test.ts
apps/mobile/__tests__/AppPaddle.test.tsx
apps/mobile/App.tsx                (solo se serve)
docs/STATUS.md, docs/DECISIONS.md  (solo le righe di questo task)
```

## Fuori scope

- «Image» (una foto) con «Paddle»: l'API la accetterebbe già, ma la richiesta
  è il disegno a mano; si apre un task con una scelta dell'utente.
- Le tessere sotto il risultato (`FigureTiles pictures`) restano senza
  immagini con «Paddle».
- Il server con TASK-369 B e gli OTA: col sì dell'utente, dal Coordinatore.

## Esito

*(a fine task)*
