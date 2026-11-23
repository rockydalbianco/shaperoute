# TASK-396 — «Freehand» in «Draw» anche con «Paddle»

**Stato**: Done — #860 in `main` (`452598d1`, 2026-11-06), in produzione con
l'OTA `3ef55853` (da `76305c1a`)
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
sezione draw con la canoa sui laghi e Mari». Confermata dall'utente nella
sessione del task il 2026-11-05: «Sì, confermo: Freehand con la canoa accanto
alle forme, niente Word e niente Image». Cambia la scelta 4 di TASK-369
(«niente "Freehand" sull'acqua in "Draw"») e i criteri di TASK-320 e TASK-340
(«Con "Paddle" "Freehand" non c'è»).

Cosa c'era già in `main`:

- **Motore e API** (TASK-369 B, #722, sul server dal 2026-11-05 a
  `10639e87`): un `ImageRequest` con `activity: "paddling"` va a
  `images.plan_drawing_on_water`, che usa `drawn_water.plan_drawn_water`: il
  disegno va dove c'è posto vicino alla partenza. Fuori dall'impronta del
  motore (`DRAWN_WATER_ONLY`).
- **La tavola** (`mapdraw/useMapCanvas.ts`, `canvasRequest.ts`) manda già
  l'attività di «Draw»: un disegno fatto con «Paddle» va a
  `/image-route-jobs` con `activity: "paddling"`.
- **L'app** (dopo TASK-376 B3b): il profilo della canoa,
  `sports/paddling.ts`, aveva `shapesOnly`; `RoutePanel.tsx` mostrava allora
  la nota «On the water, a shape of the catalogue.» al posto del selettore.
- **Parole sull'acqua**: l'API le rifiuta (`plan_water`): niente «Word».

## Cosa è stato fatto

1. **Profilo** (`sports/base.ts`, `sports/paddling.ts`): `shapesOnly` tolto
   (nessuno sport lo usava più); la canoa ha `noWords`, `noImages` (campo
   nuovo) e `drawNote` (campo nuovo: la nota di «Draw», in inglese, tradotta
   dove si mostra).
2. **`RoutePanel.tsx`**: il selettore c'è per ogni sport, senza le voci che il
   profilo toglie; con «Paddle» «Freehand · Shape», e sopra la nota del
   profilo. Una parola o una foto scelte prima di «Paddle» mostrano le forme.
   `App.tsx` non cambia: `drawKind` è già «shape» con «Paddle», e
   `onFreehand={onOpenCanvas}` era già passato.
3. **`problems.ts`**: sull'acqua un disegno (`kind === "image"`, a mano o da
   una foto) ha parole sue e non offre le forme del catalogo; vale anche per
   il nuoto, che passa dalla stessa funzione.
4. **i18n** de, es, fr, it dei testi approvati.

## Testi approvati dall'utente (2026-11-05)

1. La nota: «Cambiarla», poi «Sì, questi testi»: «On the water, the drawing
   goes where it fits near the start.» (it «Sull'acqua il disegno va dove c'è
   posto vicino alla partenza.»).
2. Un disegno che non sta sull'acqua, «Sì, questi testi»: «This drawing does
   not fit on the water near this start. Try a shorter distance, or another
   start.» e «This drawing does not fit on the water here at this distance.
   It fits at about {km} km.» / «… {mi} mi.».

## Criteri di accettazione

- [x] Con «Paddle», in «Draw», «Freehand» c'è prima di «Shape»; «Word» e
      «Image» non ci sono; sopra c'è la nota approvata.
- [x] «Freehand» con «Paddle» apre la tavola; «Draw route» manda all'API un
      disegno con `activity: "paddling"` (`AppPaddle.test.tsx`).
- [x] Un disegno sull'acqua che non ci sta mostra i testi approvati, senza le
      forme del catalogo da scegliere (`problems.test.ts`).
- [x] Corsa, nuoto e le altre attività in «Draw» come prima
      (`DrawOnMapApp.test.tsx`, `sportProfiles.test.ts`).
- [x] `npx tsc --noEmit`, `npx expo lint`, `npm run format:check` verdi in
      locale, con i test dei file toccati (12 suite, 105 test); la suite
      intera la fa la CI. Impronta iOS `6f8bba4c` su una copia pulita.

## File toccati

```
docs/tasks/TASK-396.md
apps/mobile/src/sports/base.ts
apps/mobile/src/sports/paddling.ts
apps/mobile/src/sports/sportProfiles.test.ts
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanelPaddle.test.tsx
apps/mobile/src/route/problems.ts
apps/mobile/src/route/problems.test.ts
apps/mobile/src/mapdraw/DrawOnMapApp.test.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
apps/mobile/__tests__/AppPaddle.test.tsx
docs/DECISIONS.md   (solo la precisazione di ADR-0313)
docs/STATUS.md      (solo la riga di TASK-396)
```

## Fuori scope

- «Image» (una foto) con «Paddle»: l'API la accetterebbe già; l'utente ha
  scelto «niente Image».
- Le tessere sotto il risultato (`FigureTiles pictures`) restano senza
  immagini con «Paddle».
- Gli OTA (preview e produzione): solo col sì dell'utente, dal Coordinatore.
- `STATUS.md` e `DECISIONS.md`: solo le righe di questo task (la precisazione
  di ADR-0313 e una voce in STATUS).

## Esito

Con «Paddle», in «Draw», «Freehand · Shape» e la nota «On the water, the
drawing goes where it fits near the start.»; il disegno a mano va al motore
sull'acqua di TASK-369 B. Solo JavaScript, impronta iOS `6f8bba4c`. Unita il
2026-11-06 (`452598d1`) e pubblicata in produzione con l'OTA `3ef55853`, col sì
dell'utente («ok produzione»). Prova nel simulatore (iPhone 17e, Levico): un
disegno a mano sul lago diventa un percorso sull'acqua di 1,0 mi dal pontile;
screenshot in `out/TASK-396/` del worktree. Emerso: nella tavola con la canoa
c'è «+ photo» (una foto sull'acqua, come per il nuoto); la scelta «niente
Image» riguardava il selettore di «Draw»: se va tolto, è un seguito con la sua
lista di file, da chiedere all'utente.
