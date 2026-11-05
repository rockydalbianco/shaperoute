# TASK-402 — Ruotare il disegno di quanti gradi si vuole, e aggiungere pezzi da spostare sulla mappa

**Stato**: Proposto · 2026-11-05 · solo documenti; nessun codice prima del
sì dell'utente sui testi e del via del Coordinatore sulla lista dei file
**Fase**: 5 · **Branch**: `docs/TASK-402-freehand-pieces` (documenti); poi
`feat/TASK-402-a-turn` e `feat/TASK-402-b-pieces` · **ADR**: ADR-0336

Numero e ADR dal Coordinatore (2026-11-05: TASK-402, ADR-0336; assorbe la
parte D di TASK-347).

## Obiettivo

In «Draw on the map» il disegno si **ruota di quanti gradi si vuole**, e
dalle tessere dell'app (le forme del catalogo e le immagini pronte) si
**aggiunge un pezzo sopra il disegno** invece di sostituirlo; ogni pezzo si
seleziona e si sposta, si ruota e si ridimensiona da solo, e il percorso li
unisce tutti.

## Contesto

Richiesta dell'utente del 2026-11-05: «Nel disegno a mano libera la
possibilità di ruotare il disegno di tot gradi e poi dai anche un elenco
interno da poter selezionare e muovere sulla mappa».

Alla domanda su che cosa fosse l'elenco (fra «Aggiungere pezzi», «Elenco
delle parti» e «Basta la fila di oggi») l'utente ha scelto **«Aggiungere
pezzi»**: da un elenco di forme e immagini dell'app si aggiunge un pezzo
sopra il disegno, e ogni pezzo si seleziona, si sposta, si ruota e si
ridimensiona da solo; il percorso li unisce.

Com'è oggi (`main` a `0ffada6b`, dal codice):

- `mapdraw/DrawOnMap.tsx`: «Draw | Line | Erase | Move», «Undo», «Redo»,
  «Clear all», poi la fila di tessere (`FigureTiles.tsx`: «+ photo», le 17
  forme del catalogo, le 16 immagini pronte). Una tessera **mette** la
  figura sulla mappa o **cambia** quella che c'è, dov'è e grande com'è
  (`useMapCanvas.pick`): non si aggiunge mai.
- «Move» (`map/mapPage.ts`, la parte «Draw on the map»): un dito trascina
  la figura intera o la mappa, oppure piega una linea tenuta ferma; due dita
  la ridimensionano (`sizedPoint`, in lng/lat). **Non si ruota**: i gesti di
  MapLibre sono spenti e la rotazione a due dita non c'è.
- `mapdraw/figure.ts`: `Placed = { figure, centre, unitM }`, senza angolo.
  Una figura è un disegno (`outline` + `details` + `linked`), una forma del
  catalogo (mandata per nome) o un'immagine (il contorno del motore).
- Il percorso è uno solo: un pezzo staccato dal disegno si riattacca con il
  collegamento più corto, tratteggiato sulla mappa (TASK-331 parte B,
  `drawing.linkedOf`). I limiti sono quelli del contratto:
  `MAX_OUTLINE_POINTS` 100 e `MAX_DETAIL_POINTS` 200.
- Il motore, per trovare le strade, gira ancora la figura: a passi di 15° e
  fino a ±45° dall'angolo mandato (`optimizer.py`, `MAX_TILT_DEG`, TASK-232),
  e dice di quanto (`rotation_deg`); l'app gira la mappa di `−rotation_deg`.

## Confine con TASK-347

Deciso dal Coordinatore il 2026-11-05:

- **La parte D di TASK-347** (seleziona tutto, sposta, ruota a due dita,
  ridimensiona) **passa a questo task**. Magnete, penna a punti su strada,
  nodi, righello, blocco della mappa e cronologia completa, che la parte D
  elencava insieme, restano a TASK-347 e partono con la sua parte C.
- **Restano a TASK-347** la parte B (il disegno ancorato sul telefono), la C
  (il tratto che segue le strade mentre si disegna) e la E (le tessere
  mandate `anchored`, il livello guida). `TASK-347.md` non si tocca.
- Quando TASK-347 manderà il disegno `anchored`, l'angolo scelto qui resta
  esatto (il motore non lo gira più); fino ad allora vale il limite del
  punto 4 di «Cosa fare».

## Cosa fare

### Parte A — ruotare la figura intera (solo JS dell'app)

1. **`mapdraw/turn.ts`** (nuovo): `turned(figure, deg)` gira le linee di
   un disegno o di un'immagine attorno al mezzo del suo riquadro, in unità,
   in senso orario per gradi positivi (come `rotation_deg`); i punti restano
   dentro i limiti di `sentOutline`. Una **forma del catalogo girata** di un
   angolo diverso da 0° diventa un'immagine col suo contorno (le linee
   `down` di `catalogueShapes.json`): il contratto non ha un campo per
   l'angolo di una forma mandata per nome. Tornata a 0°, è di nuovo la
   forma (ADR-0336, punto 3).
2. **I comandi** sotto la mappa, con «Move»: «−15°» e «+15°» e l'angolo
   scritto fra i due (da −180° a 180°); toccato l'angolo, si scrive il
   numero di gradi. Ogni giro è un passo di «Undo». Testi al punto 1 di
   «Testi da approvare».
3. **Due dita girano** con «Move» (`map/mapPage.ts`): insieme al
   ridimensionamento, sul gesto che già c'è, la figura gira dell'angolo fra
   le due dita, sullo schermo in pixel (`map.project`/`unproject`), non in
   lng/lat; sotto i 3° non gira (un ridimensionamento non la storce). A dita
   alzate la pagina dice all'app `{type: "figure", …, turn}` e l'app gira le
   unità con `turned`: la figura vera è quella dell'app.
4. **Il motore resta com'è**: l'angolo scelto è quello da cui parte; per le
   strade può ancora girarla fino a ±45° (TASK-232). Niente contratto nuovo,
   niente fingerprint del motore che cambia.
5. **Test** (`turn.test.ts`, `useMapCanvas`, `DrawOnMapApp.test.tsx`):
   90° quattro volte torna dov'era; un cerchio girato non cambia distanza;
   una forma girata diventa un'immagine e a 0° torna forma; «Undo» toglie il
   giro; il gesto a due dita sotto i 3° non gira.

### Parte B — i pezzi (solo JS dell'app)

1. **`mapdraw/pieces.ts`** (nuovo): la figura sulla mappa è una lista di
   pezzi, ognuno con le sue linee in unità, il suo mezzo, la sua grandezza e
   il suo angolo. Il primo pezzo dà il contorno, come oggi; le linee degli
   altri sono dettagli appesi al disegno con il collegamento più corto,
   tratteggiato (lo stesso `linkedOf` di TASK-331 parte B). `flatten`
   fa di tutti i pezzi l'`ImageOutline` di oggi: richiesta e contratto
   uguali.
2. **«Change | Add»** sopra le tessere quando sulla mappa c'è già qualcosa:
   con «Change» la tessera cambia la figura come oggi; con «Add» mette un
   pezzo nuovo nel mezzo della mappa, grande un terzo della figura, già
   selezionato. Le linee disegnate col dito restano del primo pezzo.
3. **Selezionare**: con «Move» un tocco su un pezzo lo seleziona (il pezzo
   in giallo pieno con il suo riquadro, gli altri più chiari); un tocco fuori
   dai pezzi torna alla figura intera. Un dito trascina il pezzo selezionato,
   due dita lo ridimensionano e lo girano, «−15°/+15°» girano quello. Senza
   selezione tutto vale per la figura intera, come nella parte A.
4. **«Delete piece»** sul pezzo selezionato; tolto il primo, il contorno
   passa al pezzo dopo. «Clear all», «Undo» e «Redo» come oggi, un passo per
   ogni pezzo aggiunto, spostato, girato o tolto.
5. **I limiti**: al massimo **6 pezzi**; un pezzo che porta il disegno oltre
   i punti del contratto non entra e la riga sotto la mappa dice quella di
   oggi, «That is too much for one route…» (`too_much`). Le forme e le
   immagini aggiunte si semplificano come i contorni (`SIMPLIFY_SHARE`).
6. **«Edit the drawing»** (TASK-346, TASK-369) apre la traccia come un
   pezzo solo; da lì si aggiungono gli altri.
7. **Test** (`pieces.test.ts`, `DrawOnMapApp.test.tsx`,
   `canvasRequest.test.ts`): due pezzi fanno un contorno e i dettagli col
   collegamento; spostare un pezzo non muove l'altro; il settimo pezzo non
   entra; togliere il primo promuove il secondo; la richiesta di un pezzo
   solo è identica a quella di oggi.

### Documenti, in ogni parte

- `UI.md` «Disegnare sulla mappa»: i comandi nuovi.
- `INDEX.md`: la riga di questo task.

## Testi da approvare

Nuovi testi dell'interfaccia, in inglese e nelle lingue dell'app
(`i18n/*.ts`); l'utente li approva **uno alla volta**, prima del codice
della parte che li usa:

1. (A) I comandi del giro: «−15°», «+15°», l'angolo («30°») e per
   VoiceOver «Turn left 15 degrees», «Turn right 15 degrees», «Angle, 30
   degrees. Double tap to type it».
2. (A) Il suggerimento di «Move», al posto di quello di oggi: «Drag the
   figure or the map. Hold a line still, then drag to bend it. Two fingers
   resize and turn it.»
3. (B) Sopra le tessere: «Change» e «Add».
4. (B) Il suggerimento di «Move» con più pezzi: «Tap a piece to choose it,
   then drag, resize or turn it. Tap outside to take them all.»
5. (B) «Delete piece», e la riga «Up to 6 pieces in one drawing.»

## File toccati

Documenti (questa PR): `docs/tasks/TASK-402.md` (nuovo),
`docs/DECISIONS.md` (ADR-0336), `docs/STATUS.md` (righe nuove).

Parte A (lista da mandare al Coordinatore prima del codice):

```
apps/mobile/src/mapdraw/turn.ts                 (nuovo)
apps/mobile/src/mapdraw/turn.test.ts            (nuovo)
apps/mobile/src/mapdraw/useMapCanvas.ts
apps/mobile/src/mapdraw/DrawOnMap.tsx
apps/mobile/src/mapdraw/DrawOnMapApp.test.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/i18n/*.ts                       (i testi approvati)
docs/UI.md, docs/INDEX.md, docs/STATUS.md, docs/tasks/TASK-402.md
```

Parte B:

```
apps/mobile/src/mapdraw/pieces.ts               (nuovo)
apps/mobile/src/mapdraw/pieces.test.ts          (nuovo)
apps/mobile/src/mapdraw/figure.ts
apps/mobile/src/mapdraw/useMapCanvas.ts
apps/mobile/src/mapdraw/DrawOnMap.tsx
apps/mobile/src/mapdraw/FigureTiles.tsx
apps/mobile/src/mapdraw/canvasRequest.ts
apps/mobile/src/mapdraw/canvasRequest.test.ts
apps/mobile/src/mapdraw/DrawOnMapApp.test.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/i18n/*.ts                       (i testi approvati)
docs/UI.md, docs/INDEX.md, docs/STATUS.md, docs/tasks/TASK-402.md
```

Niente motore, niente API, niente contratto, niente dipendenze nuove,
niente build nativa: tutte e due le parti arrivano con un OTA (col sì
dell'utente).

## Criteri di accettazione

- [ ] Con «Move» la figura gira di 15° per tocco, del numero scritto, e
      con due dita; «Undo» toglie il giro.
- [ ] Una forma del catalogo girata si disegna girata e torna forma a 0°.
- [ ] Con «Add» una tessera aggiunge un pezzo; ogni pezzo si seleziona, si
      sposta, si ridimensiona e si gira da solo; «Delete piece» lo toglie.
- [ ] «Draw route» fa un solo percorso con tutti i pezzi, uniti dal
      collegamento tratteggiato; con un pezzo solo la richiesta è quella di
      oggi.
- [ ] Al massimo 6 pezzi, e mai oltre i punti del contratto.
- [ ] Test deterministici verdi; tsc senza errori; testi approvati
      dall'utente nelle lingue dell'app.
- [ ] Prova sul simulatore: girare, aggiungere un cuore a un disegno,
      spostarlo, girarlo, «Draw route».

## Note

- Il motore può ancora girare la figura di ±45° per le strade (TASK-232):
  l'angolo esatto arriva con il disegno `anchored` di TASK-347.
- Le parti A e B partono una alla volta, ognuna con la sua lista dei file al
  Coordinatore; la B dopo la A in `main`, perché toccano gli stessi file.
