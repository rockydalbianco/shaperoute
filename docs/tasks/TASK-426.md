# TASK-426 — Spostare la partenza lungo il disegno

**Stato**: Done · codice in `main` (#1035, 09dd1af9); documenti nella PR
`docs/TASK-426-docs`. Resta: l'OTA di produzione (dal Coordinatore, col sì
dell'utente) e la prova sul telefono.
**Fase**: 5 · **Branch**: `feat/TASK-426-move-start` · **ADR**: ADR-0354 ·
numeri dal Coordinatore (2026-11-10)

## Obiettivo

Chiesto dall'utente il 2026-11-10, separato dal bug di TASK-425. In «Draw on
the map» la partenza del percorso è sempre il primo punto del contorno e non
si vede. Alla fine l'utente la vede e la sposta in un altro punto della
linea: il percorso parte da lì (`start` mandato al motore) e il contorno
mandato ricomincia da quel punto, così la figura resta dov'è.

## Contesto da leggere

- `apps/mobile/src/mapdraw/figure.ts` (`lookOf`, `placedStart`)
- `apps/mobile/src/mapdraw/canvasRequest.ts` (`canvasRequest`, `framedOf`)
- `apps/mobile/src/mapdraw/drawing.ts` (`startRing`, `isOpenLine`)
- `apps/mobile/src/mapdraw/turn.ts` (`shapeOutline`, `shownFigure`)
- `apps/mobile/src/mapdraw/pieces.ts` (`joinedPieces`: il contorno è
  quello del primo pezzo)
- `apps/mobile/src/mapdraw/useMapCanvas.ts` (`canvas`, `onCanvas`)
- `apps/mobile/src/map/mapPage.ts` (i gesti della pagina della mappa),
  `map/MapView.tsx` (`MapCanvas`, `CanvasEvent`)
- Motore: `route_engine/anchored.py` (il primo punto sulla partenza),
  `projection.start_at_phase`, `drawn_water.py` (sull'acqua niente
  ancoraggio)

## Cosa vede l'utente (scelta di prodotto, approvata il 2026-11-10)

- Un **pallino di partenza** sulla figura, sempre visibile in tutti i modi.
- Con **«Move»** il dito che parte sul pallino lo trascina: scorre lungo il
  contorno, agganciato al punto più vicino; dove lo si lascia parte il
  percorso. Non serve tenerlo premuto. **«Undo»** lo rimette dov'era.
- La figura resta dov'è: il contorno ricomincia da quel punto (un angolo
  vicino al dito vince; altrimenti un punto nuovo sul lato, se il contorno
  ha ancora posto sotto `MAX_OUTLINE_POINTS`).
- **Linea aperta**: solo le due estremità; portarlo all'altra inverte il
  verso della linea.
- **Dettagli**: il pallino scorre solo sul contorno, mai sui dettagli.
- **Pezzi**: sul contorno del primo pezzo, che dà il contorno al disegno.
- **Sull'acqua** (canoa, nuoto): niente pallino; il motore parte dalla riva.
- **Emoji del catalogo**: spostata la partenza, si chiede col suo contorno
  come quando è girata (ADR-0336); emoji a penna alzata: pallino fisso.
- Come oggi, il motore può ancora spostare la figura per trovare le strade.

## Cosa fare

1. `mapdraw/startPoint.ts` (nuovo): dove sta il pallino, su che linea
   scorre, e la figura con la partenza spostata; test deterministici.
2. `map/messages.ts`, `map/MapView.tsx`, `map/mapPage.ts`: il pallino
   sulla mappa (ciano, il colore di una partenza), il gesto in «Move»,
   l'evento `started`.
3. `mapdraw/useMapCanvas.ts`: il pallino nel `canvas`, l'evento in un passo
   che «Undo» riprende; test.
4. PR di solo codice; `STATUS.md`, `DECISIONS.md`, `INDEX.md`, `UI.md`
   in una PR di documenti dopo il merge.

## Criteri di accettazione

- [x] Il pallino sta sul primo punto della figura mostrata; niente pallino
      sull'acqua.
- [x] Spostato su un lato di un contorno chiuso, la richiesta ha `start` in
      quel punto e il contorno mandato comincia lì; la figura non si sposta.
- [x] Su una linea aperta va solo alle estremità e inverte la linea.
- [x] Un'emoji spostata si chiede col contorno; a penna alzata non si muove.
- [x] Con i pezzi si sposta sul contorno del primo.
- [x] «Undo» rimette la partenza di prima.
- [x] Test dei file toccati e `tsc` verdi.

## File toccati

```
docs/tasks/TASK-426.md
apps/mobile/src/mapdraw/startPoint.ts
apps/mobile/src/mapdraw/startPoint.test.ts
apps/mobile/src/mapdraw/useMapCanvas.ts
apps/mobile/src/mapdraw/useMapCanvasStart.test.ts
apps/mobile/src/mapdraw/mapPageStart.test.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/messages.ts
```

## Dove siamo

- **Esito** (2026-11-10): #1035 in `main` (09dd1af9); ADR-0354, `UI.md`,
  `INDEX.md` e la riga in `archive/COMPLETATI.md` nella PR di documenti.

- 2026-11-10: codice e test nella PR di `feat/TASK-426-move-start`
  (startPoint 15, useMapCanvasStart 8, mapPageStart 7; i test vicini e
  `tsc` verdi). Resta: merge dal Coordinatore, prova sul telefono (OTA col
  sì dell'utente), poi la PR di documenti (`STATUS.md`, `DECISIONS.md`
  ADR-0354, `INDEX.md`, `UI.md` «Draw on the map»).
- Nessun testo nuovo nell'interfaccia: il suggerimento di «Move» non
  nomina il pallino. Se serve, è una scelta di prodotto a parte.
